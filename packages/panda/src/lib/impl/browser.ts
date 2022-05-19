import { packCAN } from "can";
import Event from "weakmap-event";
import { partial } from "ap";
import wait from "../delay";
import { PandaCommand, PandaDevice } from "../types";
import { PANDA_VENDOR_ID, BUFFER_SIZE } from "../const";

const ErrorEvent = Event();
const ConnectEvent = Event();
const DisconnectEvent = Event();

export default class Panda implements PandaDevice {
  usb: USB;

  device: USBDevice | null;

  onError: () => void;

  onConnect: () => void;

  onDisconnect: () => void;

  constructor(usb: USB) {
    this.usb = usb;
    this.device = null;
    this.onError = partial(ErrorEvent.listen, this);
    this.onConnect = partial(ConnectEvent.listen, this);
    this.onDisconnect = partial(DisconnectEvent.listen, this);
  }

  async connect() {
    // Must be called via a mouse click handler, per Chrome restrictions.
    this.device = await this.usb.requestDevice({
      filters: [{ vendorId: PANDA_VENDOR_ID }],
    });
    if (this.device) {
      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);
    }

    return `${this.device?.vendorId}:${this.device?.productId}`;
  }

  async disconnect() {
    if (!this.device) {
      return false;
    }
    await this.device.close();
    this.device = null;

    return true;
  }

  async vendorRequest(data: PandaCommand, message: any) {
    // data is request, value, index
    const controlParams = {
      requestType: "vendor",
      recipient: "device",
      request: data.request,
      value: data.value,
      index: data.index,
    } as USBControlTransferParameters;

    const result = await this.device?.controlTransferIn(controlParams, message);

    return {
      data: Buffer.from(result?.data?.buffer || new ArrayBuffer(0)),
      status: result?.status,
    };
  }

  async vendorWrite(data: PandaCommand, message: any) {
    // data is request, value, index
    const controlParams = {
      requestType: "vendor",
      recipient: "device",
      request: data.request,
      value: data.value,
      index: data.index,
    } as USBControlTransferParameters;

    if (this.device) {
      await this.device.controlTransferOut(controlParams, message);
    }

    return true;
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

  async nextMessage() {
    let result: USBInTransferResult | null = null;
    let attempts = 0;
    if (this.device) {
      while (result === null) {
        try {
          result = await this.device?.transferIn(1, BUFFER_SIZE);
        } catch (err) {
          console.warn("can_recv failed, retrying");
          attempts = Math.min(++attempts, 10);
          await wait(attempts * 100);
        }
      }

      return result.data?.buffer;
    }

    throw "Could not get next message because device is not defined";
  }
}
