export interface PandaDevice {
  connect: () => Promise<string>;
  disconnect: () => Promise<boolean>;
  vendorWrite: (data: PandaCommand, message: any) => Promise<boolean>;
  vendorRequest: (
    data: PandaCommand,
    message: any
  ) => Promise<{ data?: Buffer; status?: string }>;
  nextMessage: () => Promise<ArrayBuffer | undefined>;
  onError: (fn: any) => void;
  onConnect: (fn: any) => void;
  onDisconnect: (fn: any) => void;
}

export type PandaOptions = {
  device: PandaDevice;
  wifi?: boolean;
  selectDevice?: <T>(d: T[]) => T;
};

export type PandaCommand = {
  request: number;
  value: number;
  index: number;
};
