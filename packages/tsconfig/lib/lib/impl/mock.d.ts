/// <reference types="node" />
import { PandaCommand, PandaDevice } from "../types";
export default class MockPanda implements PandaDevice {
    onError: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    constructor();
    vendorRequest(params: Partial<PandaCommand>, message: any): Promise<{
        data: Buffer;
        status: string;
    }>;
    vendorWrite(data: Partial<PandaCommand>, message: any): Promise<boolean>;
    connect(): Promise<string>;
    disconnect(): Promise<boolean>;
    nextMessage(): Promise<Buffer>;
}
//# sourceMappingURL=mock.d.ts.map