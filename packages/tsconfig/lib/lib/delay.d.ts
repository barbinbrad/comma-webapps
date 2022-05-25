export declare class CancelError extends Error {
    constructor(message: string);
}
interface CancellablePromise<T> extends Promise<T> {
    cancel: () => void;
}
declare type QueryPromise = CancellablePromise<string | boolean>;
declare const _default: (ms: number) => QueryPromise;
export default _default;
//# sourceMappingURL=delay.d.ts.map