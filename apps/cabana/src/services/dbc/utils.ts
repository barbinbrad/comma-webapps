/* eslint-disable no-param-reassign */
import { theme } from 'design';
import { Message } from '../../types';

const utils = {
  findMaxByteStateChangeCount(messages: { [key: string]: Message }) {
    return Object.values(messages)
      .map((m) => m.byteStateChangeCounts)
      .reduce((counts, countArr) => counts.concat(countArr), []) // flatten arrays
      .reduce((count1, count2) => (count1 > count2 ? count1 : count2), 0); // find max
  },

  // addCanMessage(
  //   canMessage,
  //   dbc,
  //   canStartTime,
  //   messages,
  //   prevMsgEntries,
  //   byteStateChangeCountsByMessage,
  // ) {
  //   const { address, busTime, data, bus } = canMessage;
  //   const id = `${bus}:${address.toString(16)}`;

  //   if (messages[id] === undefined) messages[id] = createMessageSpec(dbc, address, id, bus);

  //   const prevMsgEntry =
  //     messages[id].entries.length > 0
  //       ? messages[id].entries[messages[id].entries.length - 1]
  //       : prevMsgEntries[id] || null;

  //   if (
  //     byteStateChangeCountsByMessage[id] &&
  //     messages[id].byteStateChangeCounts.every((c) => c === 0)
  //   ) {
  //     messages[id].byteStateChangeCounts = byteStateChangeCountsByMessage[id];
  //   }

  //   const { msgEntry, byteStateChangeCounts } = parseMessage(
  //     dbc,
  //     busTime,
  //     address,
  //     data,
  //     canStartTime,
  //     prevMsgEntry,
  //   );

  //   messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
  //     (count, idx) => messages[id].byteStateChangeCounts[idx] + count,
  //   );

  //   messages[id].entries.push(msgEntry);

  //   return msgEntry;
  // },

  // createMessageSpec(dbc, address, id, bus) {
  //   const frame = dbc.getMessageFrame(address);
  //   const size = frame ? frame.size : 8;

  //   return {
  //     address,
  //     id,
  //     bus,
  //     entries: [],
  //     frame,
  //     byteColors: Array(size).fill(0),
  //     byteStateChangeCounts: Array(size).fill(0),
  //   };
  // },

  // determineByteStateChangeTimes(hexData, time, msgSize, lastParsedMessage) {
  //   const byteStateChangeCounts = Array(msgSize).fill(0);
  //   let byteStateChangeTimes;

  //   if (!lastParsedMessage) {
  //     byteStateChangeTimes = Array(msgSize).fill(time);
  //   } else {
  //     // debugger;
  //     byteStateChangeTimes = lastParsedMessage.byteStateChangeTimes;

  //     for (let i = 0; i < byteStateChangeTimes.length; i++) {
  //       const currentData = hexData.substr(i * 2, 2);
  //       const prevData = lastParsedMessage.hexData.substr(i * 2, 2);

  //       if (currentData !== prevData) {
  //         byteStateChangeTimes[i] = time;
  //         byteStateChangeCounts[i] = 1;
  //       }
  //     }
  //   }

  //   return { byteStateChangeTimes, byteStateChangeCounts };
  // },

  // createMessageEntry(dbc, address, time, relTime, data, byteStateChangeTimes) {
  //   return {
  //     signals: dbc.getSignalValues(address, data),
  //     address,
  //     data,
  //     time,
  //     relTime,
  //     hexData: Buffer.from(data).toString('hex'),
  //     byteStateChangeTimes,
  //     updated: Date.now(),
  //   };
  // },

  // reparseMessage(dbc, msg, lastParsedMessage) {
  //   const msgSpec = dbc.getMessageFrame(msg.address);
  //   const msgSize = msgSpec ? msgSpec.size : 8;

  //   const { byteStateChangeTimes, byteStateChangeCounts } = determineByteStateChangeTimes(
  //     msg.hexData,
  //     msg.relTime,
  //     msgSize,
  //     lastParsedMessage,
  //   );

  //   const msgEntry = {
  //     ...msg,
  //     signals: dbc.getSignalValues(msg.address, msg.data),
  //     byteStateChangeTimes,
  //     updated: Date.now(),
  //   };

  //   return { msgEntry, byteStateChangeCounts };
  // },

  // parseMessage(dbc, time, address, data, timeStart, lastParsedMessage) {
  //   let hexData;
  //   if (typeof data === 'string') {
  //     hexData = data;
  //     data = Buffer.from(data, 'hex');
  //   } else {
  //     hexData = Buffer.from(data).toString('hex');
  //   }
  //   const msgSpec = dbc.getMessageFrame(address);
  //   const msgSize = msgSpec ? msgSpec.size : Math.max(8, data.length);
  //   const relTime = time - timeStart;

  //   const { byteStateChangeTimes, byteStateChangeCounts } = determineByteStateChangeTimes(
  //     hexData,
  //     relTime,
  //     msgSize,
  //     lastParsedMessage,
  //   );
  //   const msgEntry = createMessageEntry(dbc, address, time, relTime, data, byteStateChangeTimes);

  //   return { msgEntry, byteStateChangeCounts };
  // },

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
