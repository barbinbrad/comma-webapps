import { unpackCAN } from "can";
import Event from "weakmap-event";
import { partial } from "ap";
import now from "performance-now";
import raf from "raf";
import { timeout } from "thyming";
import { PandaCommand, PandaOptions, PandaDevice } from "./types";

import wait from "./delay";

// how many messages to batch at maximum when reading as fast as we can
const MAX_MESSAGE_QUEUE = 5000;

const MessageEvent = Event();
const ErrorEvent = Event();
const ConnectEvent = Event();
const DisconnectEvent = Event();

export default class Panda {
  device: PandaDevice;

  connected: string;

  paused: boolean;

  isReading: boolean;

  messageQueue: any[];

  needsFlush: boolean;

  onMessage: (fn: unknown) => void;

  onError: (fn: unknown) => void;

  onConnect: (fn: unknown) => void;

  onDisconnect: (fn: unknown) => void;

  flushEvent?: () => void;

  constructor(options: Partial<PandaOptions>) {
    // setup event handlers
    this.onMessage = partial(MessageEvent.listen, this);
    this.onError = partial(ErrorEvent.listen, this);
    this.onConnect = partial(ConnectEvent.listen, this);
    this.onDisconnect = partial(DisconnectEvent.listen, this);
    this.flushEvent = undefined;

    // initialize device object
    this.device = options.device as PandaDevice;
    this.device.onError(partial(ErrorEvent.broadcast, this));
    this.device.onConnect(this.connectHandler.bind(this));
    this.device.onDisconnect(this.disconnectHandler.bind(this));

    // member variables
    this.paused = true;
    this.connected = "";
    this.messageQueue = [];
    this.isReading = false;
    this.needsFlush = false;

    // function binding
    this.readLoop = this.readLoop.bind(this);
    this.flushMessageQueue = this.flushMessageQueue.bind(this);
  }

  // state getters
  isConnected() {
    return !!this.connected;
  }

  isPaused() {
    return !!this.paused;
  }

  // methods
  async connect() {
    if (this.isConnected()) {
      return this.connected;
    }
    await this.device.connect();

    const serialNumber = await this.getSerialNumber();
    this.connectHandler(serialNumber);

    return serialNumber;
  }

  async disconnect() {
    if (!this.isConnected()) {
      return false;
    }
    return this.device.disconnect();
  }

  async start() {
    await this.connect();
    return this.unpause();
  }

  async pause() {
    const wasPaused = this.isPaused();
    this.paused = true;

    return !wasPaused;
  }

  async resume() {
    return this.unpause();
  }

  async unpause() {
    const wasPaused = this.isPaused();
    if (!wasPaused) {
      return false;
    }

    this.paused = false;
    this.startReading();

    return wasPaused;
  }

  // vendor API methods
  async getHealth() {
    const buf = await this.vendorRequest(
      "health",
      {
        request: 0xd2,
        value: 0,
        index: 0,
      },
      13
    );

    const voltage = (buf?.readUInt32LE(0) || 0) / 1000;
    const current = (buf?.readUInt32LE(4) || 0) / 1000;
    const isStarted = buf?.readInt8(8) === 1;
    const controlsAreAllowed = buf?.readInt8(9) === 1;
    const isGasInterceptorDetector = buf?.readInt8(10) === 1;
    const isStartSignalDetected = buf?.readInt8(11) === 1;
    const isStartedAlt = buf?.readInt8(12) === 1;

    return {
      voltage,
      current,
      isStarted,
      controlsAreAllowed,
      isGasInterceptorDetector,
      isStartSignalDetected,
      isStartedAlt,
    };
  }

  async getDeviceMetadata() {
    const buf = await this.vendorRequest(
      "getDeviceMetadata",
      {
        request: 0xd0,
        value: 0,
        index: 0,
      },
      0x20
    );

    const serial = buf?.slice(0, 0x10); // serial is the wifi style serial
    const secret = buf?.slice(0x10, 0x10 + 10);
    // let hashSig = buf?.slice(0x1c);

    if (serial && secret) {
      return [serial.toString(), secret.toString()];
    }

    return ["", ""];
  }

  async getSerialNumber() {
    const [serial] = await this.getDeviceMetadata();
    return serial;
  }

  async getSecret() {
    const [, secret] = await this.getDeviceMetadata();
    return secret;
  }

  async getVersion() {
    const buf = await this.vendorRequest(
      "getVersion",
      {
        request: 0xd6,
        value: 0,
        index: 0,
      },
      0x40
    );

    return buf?.toString();
  }

  async getType() {
    const buf = await this.vendorRequest(
      "getType",
      {
        request: 0xc1,
        value: 0,
        index: 0,
      },
      0x40
    );

    return buf?.length ? buf[0] : null;
  }

  async isWhite() {
    return (await this.getType()) === 1;
  }

  async isGrey() {
    return (await this.getType()) === 2;
  }

  async isBlack() {
    return (await this.getType()) === 3;
  }

  async hasObd() {
    const type = await this.getType();
    return type && type > 2;
  }

  async setObd(obd: boolean) {
    await this.vendorWrite("setObd", {
      request: 0xdb,
      value: obd ? 1 : 0,
      index: 0,
    });
  }

  async setSafetyMode(mode: number) {
    await this.vendorWrite("setSafetyMode", {
      request: 0xdc,
      value: mode,
      index: 0,
    });
  }

  // i/o wrappers
  async vendorRequest(
    event: string,
    controlParams: PandaCommand,
    length: number
  ) {
    try {
      const result = await this.device.vendorRequest(controlParams, length);
      return result.data;
    } catch (err) {
      ErrorEvent.broadcast(this, {
        event: `Panda.${event} failed`,
        error: err,
      });
      throw err;
    }
  }

  async vendorWrite(
    event: string,
    controlParams: PandaCommand,
    message = Buffer.from([])
  ) {
    try {
      const result = await this.device.vendorWrite(controlParams, message);

      return result;
    } catch (err) {
      ErrorEvent.broadcast(this, {
        event: `Panda.${event} failed`,
        error: err,
      });
      throw err;
    }
  }

  // event handlers
  connectHandler(usbId: string) {
    this.connected = usbId;
    ConnectEvent.broadcast(this, usbId);
  }

  disconnectHandler() {
    const previousConnection = this.connected;
    this.connected = "";
    this.paused = true;
    DisconnectEvent.broadcast(this, previousConnection);
  }

  // message queueing and flushing
  needsFlushMessageQueue() {
    this.needsFlush = true;
    if (this.flushEvent) {
      return this.flushEvent;
    }

    const unlisten = raf(this.flushMessageQueue);

    this.flushEvent = () => {
      raf.cancel(unlisten);
      this.flushEvent = undefined;
    };

    return this.flushEvent;
  }

  flushMessageQueue() {
    if (this.flushEvent) {
      this.flushEvent();
    }

    if (this.needsFlush && this.messageQueue.length) {
      const { messageQueue } = this;
      this.messageQueue = [];
      this.needsFlush = false;
      MessageEvent.broadcast(this, messageQueue);
    }
  }

  // internal reading loop
  // eslint-disable-next-line consistent-return
  startReading() {
    if (this.isReading) {
      return true;
    }
    if (this.isPaused()) {
      return false;
    }

    // start loop!
    this.isReading = true;
    this.readLoop();
  }

  // eslint-disable-next-line consistent-return
  async readLoop() {
    if (this.isPaused()) {
      this.isReading = false;
      return false;
    }
    this.isReading = true;

    for (let i = 0; i < MAX_MESSAGE_QUEUE; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const data = await this.device.nextMessage();
      const receiptTime = now() / 1000;
      const canMessages = unpackCAN(Buffer.from(data || new ArrayBuffer(0)));
      if (!canMessages.length) {
        // eslint-disable-next-line no-await-in-loop
        await wait(1);
        // eslint-disable-next-line no-continue
        continue;
      }
      this.messageQueue.push({
        time: receiptTime,
        canMessages,
      });
      this.needsFlushMessageQueue();
    }
    this.needsFlushMessageQueue();

    // repeat!
    timeout(this.readLoop);
  }
}
