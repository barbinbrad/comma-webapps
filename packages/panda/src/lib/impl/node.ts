import USB from "usb";
import { packCAN } from "can";
import Event from "weakmap-event";
import { partial } from "ap";
import { InEndpoint } from "usb/dist/usb/endpoint";
import wait from "../delay";
import { PandaCommand, PandaDevice, PandaOptions } from "../types";
import { PANDA_VENDOR_ID, BUFFER_SIZE } from "../const";

const ErrorEvent = Event();
const ConnectEvent = Event();
const DisconnectEvent = Event();

export default class Panda implements PandaDevice {
  device: USB.usb.Device | null;

  selectDeviceMethod: (d: USB.usb.Device[]) => USB.usb.Device;

  onError: () => void;

  onConnect: () => void;

  onDisconnect: () => void;

  constructor(options: Partial<PandaOptions>) {
    this.device = null;
    this.selectDeviceMethod =
      options.selectDevice ||
      function (d: USB.usb.Device[]): USB.usb.Device {
        return d[0];
      };
    this.onError = partial(ErrorEvent.listen, this);
    this.onConnect = partial(ConnectEvent.listen, this);
    this.onDisconnect = partial(DisconnectEvent.listen, this);
  }

  findDevice() {
    let devices = USB.getDeviceList();

    devices = devices.filter((device) => device.deviceDescriptor.idVendor === PANDA_VENDOR_ID);

    return this.selectDevice(devices);
  }

  selectDevice(devices: USB.usb.Device[]): USB.usb.Device {
    return this.selectDeviceMethod(devices);
  }

  async setConfiguration(desired: number) {
    return new Promise<void>((resolve, reject) => {
      this.device?.setConfiguration(
        desired,
        (err?: USB.usb.LibUSBException) => {
          if (err) {
            return reject(err);
          }
          resolve();
        }
      );
    });
  }

  async getStringDescriptor(descIndex: number) {
    return new Promise((resolve, reject) => {
      if (this.device) {
        this.device?.getStringDescriptor(descIndex, (err, buffer) => {
          if (err) {
            return reject(err);
          }
          resolve(buffer?.toString());
        });
      } else {
        return reject("Device is not defined");
      }
    });
  }

  async connect() {
    this.device = this.findDevice();
    this.device.open(false);
    await this.setConfiguration(1);
    this.device.interface(0).claim();

    return `${this.device.deviceDescriptor.idVendor}:${this.device.deviceDescriptor.idProduct}`;
  }

  async disconnect() {
    if (!this.device) {
      return false;
    }
    this.device.close();
    this.device = null;

    return true;
  }

  async vendorRequest(controlParams: PandaCommand, length: number) {
    return new Promise<{ data?: Buffer; status?: string }>(
      (resolve, reject) => {
        // controlParams is request, value, index
        const flags =
          USB.usb.LIBUSB_RECIPIENT_DEVICE |
          USB.usb.LIBUSB_REQUEST_TYPE_VENDOR |
          USB.usb.LIBUSB_ENDPOINT_IN;
        if (this.device) {
          this.device?.controlTransfer(
            flags,
            controlParams.request,
            controlParams.value,
            controlParams.index,
            length,
            (err, buffer) => {
              if (err) {
                return reject(err);
              }
              if (buffer) {
                resolve({
                  data: Buffer.from(buffer as Buffer),
                  status: "ok", // hack, find out when it's actually ok
                });
              } else {
                reject("No data was returned");
              }
            }
          );
        } else {
          reject("Device is not defined");
        }
      }
    );
  }

  async vendorWrite(
    controlParams: PandaCommand,
    message: any
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // controlParams is request, value, index
      const flags =
        USB.usb.LIBUSB_RECIPIENT_DEVICE |
        USB.usb.LIBUSB_REQUEST_TYPE_VENDOR |
        USB.usb.LIBUSB_ENDPOINT_OUT;
      if (this.device) {
        this.device?.controlTransfer(
          flags,
          controlParams.request,
          controlParams.value,
          controlParams.index,
          message,
          (err, data) => {
            if (err) {
              return reject(err);
            }

            resolve(true);
          }
        );
      } else {
        reject("Device is not defined");
      }
    });
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

  async transferIn(endpointNumber: number, length: number) {
    // in endpoints are on another address scope, so we or in 0x80 to get 0x81
    endpointNumber |= 0x80;
    let endpoint: InEndpoint | null = null;

    return new Promise<Buffer>(async (resolve, reject) => {
      this.device?.interfaces?.some((iface) => {
        const epoint = iface.endpoint(endpointNumber);

        if (epoint) {
          endpoint = epoint as InEndpoint;
          return true;
        }
      });
      if (!endpoint) {
        const err = new Error(
          `PandaJS: nodeusb: transferIn failed to find endpoint interface ${ 
            endpointNumber}`
        );
        ErrorEvent.broadcast(this, err);
        return reject(err);
      }
      if (endpoint.direction !== "in") {
        const err = new Error(
          `PandaJS: nodeusb: endpoint interface is ${ 
            endpoint.direction 
            } instead of in`
        );
        ErrorEvent.broadcast(this, err);
        return reject(err);
      }
      let data = Buffer.from([]);
      while (data.length === 0) {
        data = await this.endpointTransfer(endpoint, length);
      }
      resolve(data);
    });
  }

  async endpointTransfer(
    endpoint: InEndpoint,
    length: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      endpoint.transfer(length, (err, data) => {
        if (err) {
          return reject(err);
        }
        if (data) {
          resolve(data);
        } else {
          reject("No data was returned from endpoint");
        }
      });
    });
  }

  async nextMessage() {
    const result = null;
    let attempts = 0;

    while (result === null) {
      try {
        return await this.transferIn(1, BUFFER_SIZE);
      } catch (err) {
        console.log(err);
        console.warn("can_recv failed, retrying");
        attempts = Math.min(++attempts, 10);
        await wait(attempts * 100);
      }
    }
  }
}
