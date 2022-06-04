/* eslint-env worker */
/* eslint-disable no-restricted-globals, no-param-reassign */

import DBC from '~/models/can';
import utils from '~/models/can/utils';

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

const window = self;

function reparseEntry(entry, address, dbc, canStartTime, prevMsgEntry) {
  const data = Uint8Array.from(Buffer.from(entry.hexData, 'hex'));
  return DbcUtils.parseMessage(dbc, entry.time, address, data, canStartTime, prevMsgEntry);
}

self.onmessage = function (e) {
  /*
            entries: entry.entries,
            dbcText: dbc.text(),
            canStartTime: this.state.firstCanTime
      */
  const { messages, dbcText, canStartTime } = e.data;
  const dbc = new DBC(dbcText);

  Object.keys(messages).forEach((messageId) => {
    let prevMsgEntry = null;
    const entry = messages[messageId];
    const byteStateChangeCounts = [];

    entry.entries = entry.entries.map((message) => {
      if (message.hexData) {
        prevMsgEntry = DbcUtils.reparseMessage(dbc, message, prevMsgEntry);
      } else {
        prevMsgEntry = DbcUtils.parseMessage(
          dbc,
          message.time,
          message.address,
          message.data,
          message.timeStart,
          prevMsgEntry,
        );
      }
      byteStateChangeCounts.push(prevMsgEntry.byteStateChangeCounts);
      prevMsgEntry = prevMsgEntry.msgEntry;
      return prevMsgEntry;
    });

    entry.byteStateChangeCounts = byteStateChangeCounts.reduce((memo, val) => {
      if (!memo) {
        return val;
      }
      return memo.map((count, idx) => val[idx] + count);
    }, null);

    messages[messageId] = entry;
  });

  self.postMessage({
    messages,
  });

  self.close();
};
