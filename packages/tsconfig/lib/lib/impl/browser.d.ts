/// <reference types="w3c-web-usb" />
import { PandaCommand, PandaDevice } from "../types";
export default class Panda implements PandaDevice {
    usb: USB;
    device: USBDevice | null;
    onError: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    constructor(usb: USB);
    connect(): Promise<string>;
    disconnect(): Promise<boolean>;
    vendorRequest(data: PandaCommand, message: any): Promise<{
        data: Buffer;
        status: USBTransferStatus | undefined;
    }>;
    vendorWrite(data: PandaCommand, message: any): Promise<boolean>;
    nextMessage(): Promise<ArrayBuffer | undefined>;
}
//# sourceMappingURL=browser.d.ts.map