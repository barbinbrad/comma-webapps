/* eslint-disable no-param-reassign */
import { theme } from 'design';
import {
  ByteStateChangeCounts,
  CanMessage,
  Message,
  Messages,
  MessageEntry,
  IDbc,
} from '../../types';

const utils = {
  findMaxByteStateChangeCount(messages: { [key: string]: Message }) {
    return Object.values(messages)
      .map((m) => m.byteStateChangeCounts)
      .reduce((counts, countArr) => counts.concat(countArr), []) // flatten arrays
      .reduce((count1, count2) => (count1 > count2 ? count1 : count2), 0); // find max
  },

  addCanMessage(
    canMessage: CanMessage,
    dbc: any,
    canStartTime: number,
    messages: Messages,
    prevMsgEntries: { [key: string]: MessageEntry },
    byteStateChangeCountsByMessage: ByteStateChangeCounts,
  ) {
    const { address, busTime, data, bus } = canMessage;
    const id = `${bus}:${address.toString(16)}`;

    if (messages[id] === undefined) messages[id] = utils.createMessageSpec(dbc, address, id, bus);

    const prevMsgEntry =
      messages[id].entries.length > 0
        ? messages[id].entries[messages[id].entries.length - 1]
        : prevMsgEntries[id] || null;

    if (
      byteStateChangeCountsByMessage[id] &&
      messages[id].byteStateChangeCounts.every((c) => c === 0)
    ) {
      messages[id].byteStateChangeCounts = byteStateChangeCountsByMessage[id];
    }

    const { msgEntry, byteStateChangeCounts } = utils.parseMessage(
      dbc,
      busTime,
      address,
      data,
      canStartTime,
      prevMsgEntry,
    );

    messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
      (count, idx) => messages[id].byteStateChangeCounts[idx] + count,
    );

    messages[id].entries.push(msgEntry);

    return msgEntry;
  },

  createMessageSpec(dbc: IDbc, address: number, id: string, bus: number): Message {
    const frame = dbc?.getMessageFrame(address);
    const size = frame ? frame.size : 8;

    return {
      address,
      id,
      bus,
      entries: [] as MessageEntry[],
      frame,
      byteColors: Array(size).fill(0),
      byteStateChangeCounts: Array(size).fill(0),
      lastUpdated: 0,
    };
  },

  createMessageEntry(
    dbc: IDbc,
    address: number,
    time: number,
    relTime: number,
    data: Uint8Array,
    byteStateChangeTimes: number[],
  ) {
    return {
      signals: dbc.getSignalValues(address, data),
      address,
      data,
      time,
      timeStart: time - relTime,
      relTime,
      hexData: Buffer.from(data).toString('hex'),
      byteStateChangeTimes,
      updated: Date.now(),
    };
  },

  reparseMessage(dbc: IDbc, entry: MessageEntry, lastParsedMessage: MessageEntry | null) {
    const msgSpec = dbc.getMessageFrame(entry.address);
    const msgSize = msgSpec ? msgSpec.size : 8;

    const { byteStateChangeTimes, byteStateChangeCounts } = utils.determineByteStateChangeTimes(
      entry.hexData!,
      entry.relTime,
      msgSize,
      lastParsedMessage,
    );

    const msgEntry = {
      ...entry,
      signals: dbc.getSignalValues(entry.address, entry.data),
      byteStateChangeTimes,
      updated: Date.now(),
    };

    return { msgEntry, byteStateChangeCounts };
  },

  determineByteStateChangeTimes(
    hexData: Buffer | string,
    time: number,
    msgSize: number,
    lastParsedMessage: MessageEntry | null,
  ) {
    const byteStateChangeCounts: number[] = Array(msgSize).fill(0);
    let byteStateChangeTimes: number[];

    if (!lastParsedMessage) {
      byteStateChangeTimes = Array(msgSize).fill(time);
    } else {
      // debugger;
      byteStateChangeTimes = lastParsedMessage.byteStateChangeTimes
        ? lastParsedMessage.byteStateChangeTimes
        : [];

      for (let i = 0; i < byteStateChangeTimes.length; i++) {
        const currentData = hexData.toString().substring(i * 2, 2);
        const prevData = lastParsedMessage.hexData?.toString().substring(i * 2, 2);

        if (currentData !== prevData) {
          byteStateChangeTimes[i] = time;
          byteStateChangeCounts[i] = 1;
        }
      }
    }

    return { byteStateChangeTimes, byteStateChangeCounts };
  },

  parseMessage(
    dbc: IDbc,
    time: number,
    address: number,
    data: Uint8Array,
    timeStart: number,
    lastParsedMessage: MessageEntry | null,
  ): ParsedMessage {
    let hexData: Buffer | string;
    if (typeof data === 'string') {
      hexData = data;
      data = Buffer.from(data, 'hex');
    } else {
      hexData = Buffer.from(data).toString('hex');
    }
    const msgSpec = dbc.getMessageFrame(address);
    const msgSize = msgSpec ? msgSpec.size : Math.max(8, data.length);
    const relTime = time - timeStart;

    const { byteStateChangeTimes, byteStateChangeCounts } = utils.determineByteStateChangeTimes(
      hexData,
      relTime,
      msgSize,
      lastParsedMessage,
    );
    const msgEntry = utils.createMessageEntry(
      dbc,
      address,
      time,
      relTime,
      data,
      byteStateChangeTimes,
    );

    return { msgEntry, byteStateChangeCounts };
  },

  bigEndianBitIndex(matrixBitIndex: number) {
    return BIG_ENDIAN_START_BITS.indexOf(matrixBitIndex);
  },

  matrixBitNumber(bigEndianIndex: number) {
    return BIG_ENDIAN_START_BITS[bigEndianIndex];
  },

  setMessageByteColors(message: Message, max: number) {
    message.byteColors = message.byteStateChangeCounts
      .map((count) =>
        Number.isNaN(count) ? 100 : Math.min(1, Math.floor(9 * (count / max))) * 100,
      )
      .map((scale) => theme.colors.brand[scale]);

    return message;
  },

  // maxMessageSize(message, initial = 8) {
  //   let max = initial;
  //   for (const entry of message.entries) {
  //     const data = Buffer.from(entry.hexData, 'hex');
  //     if (data.length > max) {
  //       max = data.length;
  //     }
  //   }
  //   return max;
  // },
};

const BIG_ENDIAN_START_BITS: number[] = [];
for (let i = 0; i < 8 * 64; i += 8) {
  for (let j = 7; j > -1; j -= 1) {
    BIG_ENDIAN_START_BITS.push(i + j);
  }
}

export default utils;
export { BIG_ENDIAN_START_BITS };

type ParsedMessage = {
  msgEntry: MessageEntry;
  byteStateChangeCounts: number[];
};
