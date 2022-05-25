/// <reference types="node" />
import { PandaCommand, PandaOptions, PandaDevice } from "./types";
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
    constructor(options: Partial<PandaOptions>);
    isConnected(): boolean;
    isPaused(): boolean;
    connect(): Promise<string>;
    disconnect(): Promise<boolean>;
    start(): Promise<boolean>;
    pause(): Promise<boolean>;
    resume(): Promise<boolean>;
    unpause(): Promise<boolean>;
    getHealth(): Promise<{
        voltage: number;
        current: number;
        isStarted: boolean;
        controlsAreAllowed: boolean;
        isGasInterceptorDetector: boolean;
        isStartSignalDetected: boolean;
        isStartedAlt: boolean;
    }>;
    getDeviceMetadata(): Promise<string[]>;
    getSerialNumber(): Promise<string>;
    getSecret(): Promise<string>;
    getVersion(): Promise<string | undefined>;
    getType(): Promise<number | null>;
    isWhite(): Promise<boolean>;
    isGrey(): Promise<boolean>;
    isBlack(): Promise<boolean>;
    hasObd(): Promise<boolean | 0 | null>;
    setObd(obd: boolean): Promise<void>;
    setSafetyMode(mode: number): Promise<void>;
    vendorRequest(event: string, controlParams: PandaCommand, length: number): Promise<Buffer | undefined>;
    vendorWrite(event: string, controlParams: PandaCommand, message?: Buffer): Promise<boolean>;
    connectHandler(usbId: string): void;
    disconnectHandler(): void;
    needsFlushMessageQueue(): () => void;
    flushMessageQueue(): void;
    startReading(): boolean | undefined;
    readLoop(): Promise<false | undefined>;
}
//# sourceMappingURL=panda.d.ts.map