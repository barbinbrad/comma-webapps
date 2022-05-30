/* eslint-env worker */
/* eslint-disable no-restricted-globals, no-param-reassign */

import DBC from '~/models/can';
import utils from '~/models/can/utils';
import { MessageEntry, MessageParserWorkerInput } from '~/types';

/*  
    RawLogDownloader API

    post message to worker:
    data: {
      messages: Messages,
      dbcText: string;
      canStartTime: number;
    }  

    receive message from worker:
    data: {
      messages: Messages
    }
 */

declare const self: DedicatedWorkerGlobalScope;

function handleMessage(e: MessageEvent<MessageParserWorkerInput>) {
  const { messages, dbcText } = e.data;
  const dbc = new DBC(dbcText);

  Object.keys(messages).forEach((messageId) => {
    let prevMsgEntry: MessageEntry | null = null;
    const entry = messages[messageId];
    const byteStateChangeCounts: number[][] = [];

    entry.entries = entry.entries.map((message) => {
      const internalMessageEntry = message.hexData
        ? utils.reparseMessage(dbc, message, prevMsgEntry)
        : utils.parseMessage(
            dbc,
            message.time,
            message.address,
            message.data,
            message.timeStart,
            null,
          );

      byteStateChangeCounts.push(internalMessageEntry.byteStateChangeCounts);
      prevMsgEntry = internalMessageEntry.msgEntry;
      return prevMsgEntry;
    });

    entry.byteStateChangeCounts = byteStateChangeCounts.reduce((memo, val) => {
      if (!memo || memo.length === 0) {
        return val;
      }
      return memo.map((count, idx) => val[idx] + count);
    }, []);

    messages[messageId] = entry;
  });

  self.postMessage({
    messages,
  });

  self.close();
}

self.onmessage = handleMessage;
