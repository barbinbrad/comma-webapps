export interface ISignal {
  name: string;
  startBit: number;
  size: number;
  isLittleEndian: boolean;
  isSigned: boolean;
  isFloat: boolean;
  factor: number;
  offset: number;
  unit: string;
  receiver: string[];
  comment: string | null;
  multiplex: string | null;
  min: number | null;
  max: number | null;
  // colors: string[];
  uid: string | null;
  valueDescriptions: Map<string, string>;
  text: () => string;
  valueDescriptionText: (id: number) => string;
}

export interface IFrame {
  name: string;
  id: number;
  size: number;
  transmitters: string[];
  extended: boolean;
  comment: string | null;
  signals: { [key: string]: ISignal };
}

export type MessageEntry = {
  signals: { [key: string]: number | bigint };
  address: number;
  data: Buffer | string;
  time: number;
  relTime: number;
  hexData: Buffer | string;
  byteStateChangeTimes: number[];
  updated: Date;
};

export type Message = {
  address: number;
  entries: MessageEntry[];
  byteColors: string[];
  byteStateChangeCounts: number[];
  frame?: IFrame;
};

export type Messages = { [key: string]: Message };

export type StreamingData = {
  newMessages: Messages;
  seekTime: number;
  lastBusTime: number;
  firstCanTime: number;
  maxByteStateChangeCount: number;
};
