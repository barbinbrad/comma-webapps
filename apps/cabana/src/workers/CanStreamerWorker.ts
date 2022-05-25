/* eslint-env worker */
/* eslint-disable no-restricted-globals, no-param-reassign */

import DBC from '../models/dbc';
import utils from '../models/dbc/utils';
import {
  CanWorkerInput,
  MessageEntry,
  ByteStateChangeCounts,
  TimedCanMessages,
  Messages,
  CanWorkerOutput,
} from '../types';

/*  
    CanStreamerWorker API

    post message to worker:
    data: {
      newCanMessages: CanMessages[],
      prevMsgEntries: {[key: string]: MessageEntry},
      firstCanTime: number,
      dbcText: string,
      lastBusTime: number,
      byteStateChangeCountsByMessage: ByteStateChangeCounts,
      maxByteStateChangeCount: number,
    }  

    receive message from worker:
    data: {
      newMessages: Messages;
      seekTime: number;
      lastBusTime: number;
      firstCanTime: number;
      maxByteStateChangeCount: number;
    }
 */

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<CanWorkerInput>) => {
  const {
    newCanMessages,
    prevMsgEntries,
    firstCanTime,
    dbcText,
    lastBusTime,
    byteStateChangeCountsByMessage,
    maxByteStateChangeCount,
  } = event.data;

  // TODO: should we pass the DBC as a parameter instead of re-creating it?
  const dbc = new DBC(dbcText);

  processStreamedCanMessages(
    newCanMessages,
    prevMsgEntries,
    firstCanTime,
    dbc,
    lastBusTime,
    byteStateChangeCountsByMessage,
    maxByteStateChangeCount,
  );
};

function processStreamedCanMessages(
  newCanMessages: TimedCanMessages[],
  prevMsgEntries: { [key: string]: MessageEntry },
  firstCanTime: number,
  dbc: DBC,
  lastBusTime: number,
  byteStateChangeCountsByMessage: ByteStateChangeCounts,
  maxByteStateChangeCount: number,
) {
  const messages: Messages = {};
  let lastCanTime;

  for (let batch = 0; batch < newCanMessages.length; batch++) {
    const { time, canMessages } = newCanMessages[batch];
    // TODO: do we need this?
    // canMessages = canMessages.sort((msg1, msg2) => {
    //   if (msg1[1] < msg2[1]) {
    //     return -1;
    //   }
    //   if (msg1[1] > msg2[1]) {
    //     return 1;
    //   }
    //   return 0;
    // });

    let busTimeSum = 0;

    for (let i = 0; i < canMessages.length; i++) {
      const { busTime } = canMessages[i];

      let prevBusTime;
      if (i === 0) {
        if (lastBusTime === null) {
          prevBusTime = 0;
        } else {
          prevBusTime = lastBusTime;
        }
      } else {
        prevBusTime = canMessages[i - 1].busTime;
      }

      if (busTime >= prevBusTime) {
        busTimeSum += busTime - prevBusTime;
      } else {
        busTimeSum += 0x10000 - prevBusTime + busTime;
      }
      const message = { ...canMessages[i] };
      message.busTime = time + busTimeSum / 500000.0;

      if (firstCanTime === 0) {
        firstCanTime = message.busTime;
      }

      const msgEntry = utils.addCanMessage(
        message,
        dbc,
        firstCanTime,
        messages,
        prevMsgEntries,
        byteStateChangeCountsByMessage,
      );
      if (i === canMessages.length - 1) {
        lastCanTime = msgEntry.relTime;
      }
    }

    lastBusTime = canMessages[canMessages.length - 1].busTime;
    const newMaxByteStateChangeCount = utils.findMaxByteStateChangeCount(messages);

    if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
      maxByteStateChangeCount = newMaxByteStateChangeCount;
    }

    // TODO: do we need this?
    // Object.keys(messages).forEach((key) => {
    //   messages[key] = utils.setMessageByteColors(messages[key], maxByteStateChangeCount);
    // });
  }

  const output: CanWorkerOutput = {
    newMessages: messages,
    seekTime: lastCanTime || 0,
    lastBusTime,
    firstCanTime,
    maxByteStateChangeCount,
  };

  self.postMessage(output);
}
