import { packCAN } from "can";
import Event from "weakmap-event";
import { partial } from "ap";
import net from "net";
import wait from "../delay";
import { PandaCommand, PandaDevice } from "../types";
import { PANDA_HOST, PANDA_TCP_PORT, REQUEST_OUT } from "../const";

const ErrorEvent = Event();
const ConnectEvent = Event();
const DisconnectEvent = Event();
const DataEvent = Event();
const MessageEvent = Event();

export default class Panda implements PandaDevice {
  device: null;

  socket: net.Socket | null;

  ignoreLengths: { [key: number]: number };

  onError: () => void;

  onConnect: () => void;

  onDisconnect: () => void;

  constructor() {
    this.device = null;
    this.socket = null;
    this.ignoreLengths = {};
    this.onError = partial(ErrorEvent.listen, this);
    this.onConnect = partial(ConnectEvent.listen, this);
    this.onDisconnect = partial(DisconnectEvent.listen, this);
    this.handleData = this.handleData.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  async connectToTCP() {
    return new Promise<boolean | string>((resolve, reject) => {
      const fail = (err: (...args: any) => void) => {
        this.socket = null;
        ErrorEvent.broadcast(this, err);
        reject(err);
      };
      const succeed = () => {
        this.socket?.off("close", fail);
        this.socket?.off("error", fail);

        resolve(true);
      };

      this.socket = net.connect(PANDA_TCP_PORT, PANDA_HOST);
      this.socket.on("connect", succeed);
      this.socket.on("close", fail);
      this.socket.on("error", fail);
    });
  }

  async connect() {
    this.ignoreLengths = {};
    await this.connectToTCP();
    this.socket?.on("data", this.handleData);
    this.socket?.on("close", partial(DisconnectEvent.broadcast, this));
    this.socket?.on("error", this.handleError);

    return `${this.socket?.localAddress}:${this.socket?.localPort}`;
  }

  async disconnect() {
    if (!this.socket) {
      return false;
    }
    await this.socket.destroy();
    this.socket = null;

    return true;
  }

  async vendorRequest(data: PandaCommand, message: any) {
    const result = (await this.controlRead(
      REQUEST_OUT,
      data.request,
      data.value,
      data.index,
      message
    )) as ArrayBuffer;

    return {
      data: Buffer.from(result),
      status: "ok", // hack, find out when it's actually ok
    };
  }

  async vendorWrite(data: PandaCommand, message: any) {
    return false;
  }

  // not used anymore, but is nice for reference
  async nextFakeMessage() {
    await wait(10);

    return packCAN({
      address: 0,
      busTime: ~~(Math.random() * 65000),
      data: Buffer.from("".padEnd(16, "0")),
      bus: 0,
    });
  }

  async controlRead(
    requestType: number,
    request: number,
    value: number,
    index: number,
    length = 0
  ) {
    if (!this.ignoreLengths[length]) {
      this.ignoreLengths[length] = 0;
    }
    this.ignoreLengths[length]++;

    const buf = Buffer.alloc(12);
    buf.writeUInt16LE(0, 0);
    buf.writeUInt16LE(0, 2);
    buf.writeUInt8(requestType, 4);
    buf.writeUInt8(request, 5);
    buf.writeUInt16LE(value, 6);
    buf.writeUInt16LE(index, 8);
    buf.writeUInt16LE(length, 10);

    this.socket?.write(buf);

    return this.nextIncomingData();
  }

  async nextIncomingData() {
    return new Promise((resolve) => {
      once(partial(DataEvent.listen, this), resolve);
    });
  }

  async nextIncomingMessage(): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      once(partial(MessageEvent.listen, this), resolve);
    });
  }

  async nextMessage() {
    const result = null;
    let attempts = 0;

    while (result === null) {
      try {
        return await this.bulkRead(1);
      } catch (err) {
        console.warn("can_recv failed, retrying");
        attempts = Math.min(++attempts, 10);
        await wait(attempts * 100);
      }
    }
  }

  async handleData(buf: Buffer) {
    const length = buf.readUInt32LE(0);
    const data = buf.slice(4, 4 + length);
    if (this.ignoreLengths[length]) {
      this.ignoreLengths[length]--;
      if (this.ignoreLengths[length] === 0) {
        delete this.ignoreLengths[length];
      }
      DataEvent.broadcast(this, data);
    } else {
      MessageEvent.broadcast(this, data);
    }
  }

  async handleError(err: { errno: string }) {
    if (err.errno === "ETIMEDOUT") {
      DisconnectEvent.broadcast(this, err.errno);
    } else {
      ErrorEvent.broadcast(this, err);
    }
  }

  async bulkRead(endpoint: number) {
    const promise = this.nextIncomingMessage();

    const buf = Buffer.alloc(4);
    buf.writeUInt16LE(endpoint, 0);
    buf.writeUInt16LE(0, 2);
    this.socket?.write(buf);

    return promise;
  }
}

function once(
  event: (h: () => void) => any,
  handler: {
    (value: any): void;
    (value: ArrayBuffer | PromiseLike<ArrayBuffer>): void;
    apply?: any;
  }
) {
  const unlisten = event(onceHandler);

  return unlisten;

  function onceHandler(this: any) {
    unlisten();
    handler.apply(this, arguments);
  }
}
