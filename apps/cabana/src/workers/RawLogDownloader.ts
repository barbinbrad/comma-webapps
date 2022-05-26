/* eslint-env worker */
/* eslint-disable no-restricted-globals, no-param-reassign */
// TODO: convert log_reader & capnp_ts to internal packages
import LogStream from '@commaai/log_reader';

import RlogService from '../services/rlog/rlog';
import utils from '../models/dbc/utils';
import DBC from '../models/dbc';
import {
  ICacheEntry,
  IDbc,
  CerealMessage,
  CerealCanMessage,
  Messages,
  MessageEntry,
  RawLogWorkerInput,
  Thumbnail,
} from '../types';

/*  
    RawLogDownloader API

    post message to worker:
    data: {
      action?: string,
      base: string,
      num: number,
      isDemo: boolean,
      isLegacyShare: boolean,
      logUrls: string[],
      dbc?: IDbc,
      dbcText: string,
      route: string,
      part: number,
      canStartTime: number,
      prevMsgEntries: { [key: string]: MessageEntry },
      maxByteStateChangeCount: number,
    }  

    receive message from worker:
    data: {
      firstFrameTime?: number,
      isFinished: boolean,
      newMessages: Messages,
      newThumbnails: Thumbnail[],
      routeInitTime: number,
      maxByteStateChangeCount: number,
    }
 */

declare const self: DedicatedWorkerGlobalScope;
const DEBOUNCE_DELAY = 100;

class CacheEntry implements ICacheEntry {
  options: RawLogWorkerInput;

  messages: Messages;

  thumbnails: Thumbnail[];

  route: string;

  part: number;

  dbc: IDbc;

  logUrls: string[];

  ended: boolean;

  batching: boolean;

  constructor(options: RawLogWorkerInput) {
    this.options = options;

    const { route, part, dbc, logUrls } = options;
    this.messages = {};
    this.thumbnails = [];
    this.route = route;
    this.part = part;
    this.dbc = dbc!;
    this.logUrls = logUrls || [];
    this.batching = false;
    this.ended = false;
  }

  insertCanMessage(logTime: number, msg: CerealCanMessage) {
    const src = msg.Src;
    const address = Number(msg.Address);
    const addressHexStr = address.toString(16);
    const id = `${src}:${addressHexStr}`;

    if (!this.messages[id]) {
      this.messages[id] = utils.createMessageSpec(this.dbc!, address, id, src);
    }

    const data = new Uint8Array(msg.Dat);
    const msgEntry: MessageEntry = {
      time: logTime,
      address,
      data,
      timeStart: this.options.routeInitTime!,
      relTime: logTime - this.options.routeInitTime!,
    };

    this.messages[id].entries.push(msgEntry);

    // console.log(id);
  }

  async loadData() {
    let url = null;

    if (!this.options.isLegacyShare) {
      url = this.logUrls[this.part];
    }

    if (!url || url.indexOf('.7z') !== -1) {
      self.postMessage({
        error: 'Invalid or missing log files',
      });
      return;
    }

    const res = await RlogService.getLogPart(this.logUrls[this.part]);
    const logReader = new LogStream(res);

    res.on('end', () => {
      console.log('Stream ended');
      setTimeout(() => {
        this.ended = true;
        this.queueBatch();
      });
    });

    logReader((msg: CerealMessage) => {
      if (this.ended) {
        console.log('You can get msgs after end', msg);
      }
      if ('InitData' in msg) {
        if (this.options.routeInitTime == null) {
          this.options.routeInitTime = msg.LogMonoTime / 1e9;
        }
      } else if (this.part === 0 && 'Frame' in msg) {
        if (this.options.firstFrameTime == null) {
          this.options.firstFrameTime = msg.Frame!.TimestampEof / 1e9;
        }
      } else if ('Can' in msg) {
        const monoTime = msg.LogMonoTime / 1000000000;
        msg.Can!.forEach((m) => this.insertCanMessage(monoTime, m));
      } else if ('Thumbnail' in msg) {
        const monoTime = msg.LogMonoTime / 1000000000 - this.options.routeInitTime!;
        const data = new Uint8Array(msg.Thumbnail!.Thumbnail);
        this.thumbnails.push({ data, monoTime });
      } else {
        // console.log(Object.keys(msg));
        return;
      }
      this.queueBatch();
    });
  }

  sendBatch() {
    this.batching = false;
    const { messages, thumbnails } = this;
    this.messages = {};
    this.thumbnails = [];

    const { routeInitTime, firstFrameTime } = this.options;
    let { maxByteStateChangeCount } = this.options;
    const newMaxByteStateChangeCount = utils.findMaxByteStateChangeCount(messages);
    if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
      maxByteStateChangeCount = newMaxByteStateChangeCount;
    }

    Object.keys(messages).forEach((key) => {
      messages[key] = utils.setMessageByteColors(messages[key], maxByteStateChangeCount);
    });

    self.postMessage({
      newMessages: messages,
      newThumbnails: thumbnails,
      isFinished: this.ended,
      maxByteStateChangeCount,
      routeInitTime,
      firstFrameTime,
    });

    if (this.ended) {
      console.log('Sending finished');
      close();
    }
  }

  queueBatch() {
    if (!this.batching) {
      this.batching = true;
      setTimeout(() => {
        this.sendBatch();
        this.batching = false;
      }, DEBOUNCE_DELAY);
    }
  }
}

function handleMessage(msg: MessageEvent<RawLogWorkerInput>) {
  const { data } = msg;

  if (data.action === 'terminate') {
    close();
    return;
  }

  data.dbc = new DBC(data.dbcText);

  const entry = new CacheEntry(data);
  // load in the data!
  entry.loadData();
}

self.onmessage = handleMessage;
