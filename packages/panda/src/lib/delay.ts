

export class CancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelError";
  }
}

interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void;
}

type QueryPromise = CancellablePromise<string | boolean>;

const createDelay =
  (willResolve: boolean) =>
  (ms: number): QueryPromise => {
    let timeoutId: ReturnType<typeof setTimeout> | null;
    let internalReject: (reason?: any) => void;

    const delayPromise: Partial<QueryPromise> = new Promise<string | boolean>(
      (resolve, reject) => {
        internalReject = reject;

        timeoutId = setTimeout(() => {
          const settle = willResolve ? resolve : reject;
          settle(true);
        }, ms);
      }
    );

    delayPromise.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        internalReject(new CancelError("Delay canceled"));
      }
    };

    return delayPromise as QueryPromise;
  };

export default createDelay(true);
