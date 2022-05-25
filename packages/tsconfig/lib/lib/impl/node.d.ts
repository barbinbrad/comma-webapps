/// <reference types="node" />
import USB from "usb";
import { InEndpoint } from "usb/dist/usb/endpoint";
import { PandaCommand, PandaDevice, PandaOptions } from "../types";
export default class Panda implements PandaDevice {
    device: USB.usb.Device | null;
    selectDeviceMethod: (d: USB.usb.Device[]) => USB.usb.Device;
    onError: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    constructor(options: Partial<PandaOptions>);
    findDevice(): USB.usb.Device;
    selectDevice(devices: USB.usb.Device[]): USB.usb.Device;
    setConfiguration(desired: number): Promise<void>;
    getStringDescriptor(descIndex: number): Promise<unknown>;
    connect(): Promise<string>;
    disconnect(): Promise<boolean>;
    vendorRequest(controlParams: PandaCommand, length: number): Promise<{
        data?: Buffer | undefined;
        status?: string | undefined;
    }>;
    vendorWrite(controlParams: PandaCommand, message: any): Promise<boolean>;
    nextFakeMessage(): Promise<Buffer>;
    transferIn(endpointNumber: number, length: number): Promise<Buffer>;
    endpointTransfer(endpoint: InEndpoint, length: number): Promise<Buffer>;
    nextMessage(): Promise<Buffer | undefined>;
}
//# sourceMappingURL=node.d.ts.map