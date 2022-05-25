/// <reference types="node" />
import net from "net";
import { PandaCommand, PandaDevice } from "../types";
export default class Panda implements PandaDevice {
    device: null;
    socket: net.Socket | null;
    ignoreLengths: {
        [key: number]: number;
    };
    onError: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    constructor();
    connectToTCP(): Promise<string | boolean>;
    connect(): Promise<string>;
    disconnect(): Promise<boolean>;
    vendorRequest(data: PandaCommand, message: any): Promise<{
        data: Buffer;
        status: string;
    }>;
    vendorWrite(data: PandaCommand, message: any): Promise<boolean>;
    nextFakeMessage(): Promise<Buffer>;
    controlRead(requestType: number, request: number, value: number, index: number, length?: number): Promise<unknown>;
    nextIncomingData(): Promise<unknown>;
    nextIncomingMessage(): Promise<ArrayBuffer>;
    nextMessage(): Promise<ArrayBuffer | undefined>;
    handleData(buf: Buffer): Promise<void>;
    handleError(err: {
        errno: string;
    }): Promise<void>;
    bulkRead(endpoint: number): Promise<ArrayBuffer>;
}
//# sourceMappingURL=wifi.d.ts.map