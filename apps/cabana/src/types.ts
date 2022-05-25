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

export interface IBoardUnit {
  name: string;
  attributes: object;
  comment: string | null;
  text: () => string;
}

export interface IDbc {
  boardUnits: IBoardUnit[];
  comments: string[];
  dbcText?: string;
  messages: Map<number, IFrame>;
  valueTables: Map<string, Map<string, string>>;
  lastUpdated?: number;
  getMessageFrame: (address: number) => IFrame | undefined;
  getSignalValues: (address: number, data: Uint8Array) => { [key: string]: number | bigint };
}

export type ByteStateChangeCounts = { [key: string]: number[] };

export type CanMessage = {
  address: number;
  busTime: number;
  data: Buffer;
  bus: number;
};

export type CanWorkerInput = {
  newCanMessages: TimedCanMessages[];
  prevMsgEntries: { [key: string]: MessageEntry };
  firstCanTime: number;
  dbcText: string;
  lastBusTime: number;
  byteStateChangeCountsByMessage: ByteStateChangeCounts;
  maxByteStateChangeCount: number;
};

export type CanWorkerOutput = {
  newMessages: Messages;
  seekTime: number;
  lastBusTime: number;
  firstCanTime: number;
  maxByteStateChangeCount: number;
};

export type DataCache = {
  messages: Messages;
  thumbnails: Thumbnail[];
  lastUpdated: number;
  lastUsed: number;
  promise?: Promise<DataCache | undefined>;
};

export type Message = {
  id: string;
  bus: number;
  address: number;
  entries: MessageEntry[];
  byteColors: string[];
  byteStateChangeCounts: number[];
  frame?: IFrame;
  lastUpdated: number;
};

export type MessageEntry = {
  signals?: { [key: string]: number | bigint };
  address: number;
  data: Uint8Array;
  time: number;
  timeStart: number;
  relTime: number;
  hexData?: Buffer | string;
  byteStateChangeTimes?: number[];
  updated?: number;
};

export type MessageParserWorkerInput = {
  messages: Messages;
  dbcText: string;
  canStartTime: number;
};

export type MessageParserWorkerOutput = {
  messages: Messages;
};

export type Messages = { [key: string]: Message };

export type MessageTuple = [string, Message];

export type TimedCanMessages = {
  time: number;
  canMessages: CanMessage[];
};

export type RawLogWorkerInput = {
  action?: string;
  base: string;
  num: number;
  isDemo: boolean;
  isLegacyShare: boolean;
  logUrls: string[];
  dbc?: IDbc;
  dbcText: string;
  route: string;
  part: number;
  canStartTime: number;
  prevMsgEntries: { [key: string]: MessageEntry };
  maxByteStateChangeCount: number;
};

export type RawLogWorkerOutput = {
  firstFrameTime?: number;
  isFinished: boolean;
  newMessages: Messages;
  newThumbnails: Thumbnail[];
  routeInitTime: number;
  maxByteStateChangeCount: number;
};

export type Route = {
  fullname: string;
  proclog?: number;
  start_time?: moment.Moment;
  url?: string;
  maxqcamera?: number;
};

export type SharedSignature = {
  exp: number | string;
  sig: number | string;
};

export type SpawnWorkerOptions = {
  prevMsgEntries?: { [key: string]: MessageEntry };
};

export type Thumbnail = {};

export type WorkerHashMap = { [key: string]: { part: number; worker: Worker } };
