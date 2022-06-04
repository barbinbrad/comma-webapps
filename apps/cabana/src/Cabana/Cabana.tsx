/* eslint-disable react/require-default-props */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/sort-comp */
/* eslint-disable no-param-reassign */
/* eslint-disable react/destructuring-assignment */
import { Component } from 'react';
import { Flex, HStack, VStack } from '@chakra-ui/react';
import { raw as RawDataApi, drives as DrivesApi } from 'api';
import CommaAuth, { storage as CommaAuthStorage, config as AuthConfig } from 'auth';
import moment from 'moment';
import PandaAPI from 'panda';
import Panda from 'panda/dist/module/lib/panda'; // TODO: type should come from main package
import { interval, timeout } from 'thyming';
import { PART_SEGMENT_LENGTH, STREAMING_WINDOW, GITHUB_AUTH_TOKEN_KEY } from '~/config';
import Video from '~/components/Video';
import MessageList from '~/components/MessageList';
import Navigation from '~/components/Navigation';
import { demoLogUrls, demoRoute } from '~/data/demo';
import DBC from '~/models/can';
import DBCUtils from '~/models/can/utils';
import Storage from '~/services/localStorage/localStorage';
import OpenDbcClient from '~/services/opendbc';
import UnloggerClient from '~/services/unlogger/unlogger';
import {
  IFrame,
  ByteStateChangeCounts,
  CanWorkerOutput,
  DataCache,
  MessageEntry,
  Message,
  Messages,
  MessageParserWorkerOutput,
  MessageTuple,
  TimedCanMessages,
  Thumbnail,
  RawLogWorkerOutput,
  Route,
  SharedSignature,
  SpawnWorkerOptions,
  WorkerHashMap,
} from '~/types';

import debounce from '~/utils/debounce';
import { hash } from '~/utils/string';
import { modifyQueryParameters } from '~/utils/url';

import CanStreamer from '~/workers/CanStreamerWorker?worker';
import MessageParser from '~/workers/MessageParserWorker?worker';
import RawLogDownloader from '~/workers/RawLogDownloader?worker';

const dataCache: { [key: number]: DataCache } = {};

export default class Cabana extends Component<Props, State> {
  pandaReader?: Panda;

  canStreamerWorker?: Worker;

  openDbcClient?: OpenDbcClient;

  unloggerClient?: UnloggerClient;

  loadMessagesFromCacheRunning: boolean;

  dataCacheTimer?: () => void;

  loadMessagesFromCacheTimer: (() => void) | null;

  constructor(props: Props) {
    super(props);
    this.state = {
      messages: {},
      thumbnails: [],
      selectedMessages: [],
      route: null,
      canFrameOffset: 0,
      routeInitTime: 0,
      firstFrameTime: 0,
      firstCanTime: null,
      lastBusTime: null,
      selectedMessage: null,
      currentParts: [0, 0],
      currentPart: 0,
      currentWorkers: {},
      spawnWorkerHash: null,
      loadingParts: [],
      loadedParts: [],
      showOnboarding: false,
      showLoadDbc: false,
      showSaveDbc: false,
      showEditMessageModal: false,
      editMessageModalMessage: null,
      dbc: props.dbc ? props.dbc : new DBC(),
      dbcText: props.dbc ? props.dbc.text() : new DBC().text(),
      dbcFilename: props.dbcFilename ? props.dbcFilename : 'New_DBC',
      dbcLastSaved: null,
      seekTime: 0,
      seekIndex: 0,
      maxByteStateChangeCount: 0,
      partsLoaded: 0,
      attemptingPandaConnection: false,
      live: false,
      isGithubAuthenticated: props.githubAuthToken !== null && props.githubAuthToken !== undefined,
      shareUrl: null,
      logUrls: null,
    };

    this.openDbcClient = new OpenDbcClient(props.githubAuthToken);
    if (props.unlogger) {
      this.unloggerClient = new UnloggerClient();
    }

    this.showOnboarding = this.showOnboarding.bind(this);
    this.hideOnboarding = this.hideOnboarding.bind(this);
    this.showLoadDbc = this.showLoadDbc.bind(this);
    this.hideLoadDbc = this.hideLoadDbc.bind(this);
    this.showSaveDbc = this.showSaveDbc.bind(this);
    this.hideSaveDbc = this.hideSaveDbc.bind(this);
    this.showEditMessageModal = this.showEditMessageModal.bind(this);
    this.hideEditMessageModal = this.hideEditMessageModal.bind(this);
    this.onDbcSelected = this.onDbcSelected.bind(this);
    this.onDbcSaved = this.onDbcSaved.bind(this);
    this.onConfirmedSignalChange = this.onConfirmedSignalChange.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.onMessageFrameEdited = this.onMessageFrameEdited.bind(this);
    this.onSeek = this.onSeek.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onMessageSelected = this.onMessageSelected.bind(this);
    this.onMessageUnselected = this.onMessageUnselected.bind(this);
    this.initCanData = this.initCanData.bind(this);
    this.updateSelectedMessages = this.updateSelectedMessages.bind(this);
    this.handlePandaConnect = this.handlePandaConnect.bind(this);
    this.processStreamedCanMessages = this.processStreamedCanMessages.bind(this);
    this.onStreamedCanMessagesProcessed = this.onStreamedCanMessagesProcessed.bind(this);
    this.showingModal = this.showingModal.bind(this);
    this.githubSignOut = this.githubSignOut.bind(this);
    // this.downloadLogAsCSV = this.downloadLogAsCSV.bind(this);

    this.loadMessagesFromCacheRunning = false;
    this.loadMessagesFromCacheTimer = null;
  }

  async componentDidMount() {
    this.pandaReader = await new PandaAPI();
    this.pandaReader?.onMessage(this.processStreamedCanMessages);

    this.dataCacheTimer = interval(() => {
      const { currentParts } = this.state;
      let { loadedParts } = this.state;
      if (this.loadMessagesFromCacheRunning || loadedParts.length < 4) {
        return;
      }
      loadedParts.forEach((part) => {
        if (part >= currentParts[0] && part <= currentParts[1]) {
          return;
        }
        if (Date.now() - dataCache[part].lastUsed > 3 * 60 * 1000) {
          console.log('Decaching part', part);
          loadedParts = loadedParts.filter((p) => p !== part);
          this.setState(
            {
              loadedParts,
            },
            () => {
              delete dataCache[part];
            },
          );
        }
      });
    }, 10000);

    const { dongleId, exp, isDemo, max, name, sig, url } = this.props;
    if (CommaAuth.isAuthenticated() && !name) {
      this.showOnboarding();
    } else if (isDemo) {
      // is demo!

      const logUrls = demoLogUrls;
      const route = demoRoute;

      this.setState(
        {
          logUrls,
          route,
          currentParts: [0, 2],
          currentPart: 0,
        },
        this.initCanData,
      );
    } else if (max && url && !exp && !sig) {
      // legacy share? maybe dead code
      const startTime = moment(name, 'YYYY-MM-DD--H-m-s');

      const route = {
        fullname: `${dongleId}|${name}`,
        proclog: max,
        url,
        start_time: startTime,
      };
      this.setState(
        {
          route,
          currentParts: [0, Math.min(max, PART_SEGMENT_LENGTH - 1)],
        },
        this.initCanData,
      );
    } else if (dongleId && name) {
      const routeName = `${dongleId}|${name}`;
      let routePromise;
      let logUrlsPromise;

      if (url) {
        routePromise = Promise.resolve({
          maxqcamera: null,
          url,
        });
      } else {
        routePromise = DrivesApi.getRouteInfo(routeName);
      }

      if (sig && exp) {
        logUrlsPromise = RawDataApi.getLogUrls(routeName, {
          sig,
          exp,
        });
      } else {
        logUrlsPromise = RawDataApi.getLogUrls(routeName);
      }
      Promise.all([routePromise, logUrlsPromise])
        .then((initData) => {
          const [route, logUrls] = initData;
          const newState: State = {
            ...this.state,
            route: {
              fullname: routeName,
              proclog: logUrls.length - 1,
              start_time: moment(name, 'YYYY-MM-DD--H-m-s'),
              url: route.url.replace(
                'chffrprivate.blob.core.windows.net',
                'chffrprivate.azureedge.net',
              ),
              maxqcamera: route.maxqcamera ? route.maxqcamera : logUrls.length - 1,
            },
            currentParts: [0, Math.min(logUrls.length - 1, PART_SEGMENT_LENGTH - 1)],
            logUrls,
          };
          this.setState(newState, this.initCanData);

          DrivesApi.getShareSignature(routeName).then((shareSignature: SharedSignature) =>
            this.setState({
              shareUrl: modifyQueryParameters({
                add: {
                  exp: shareSignature.exp.toString(),
                  sig: shareSignature.sig.toString(),
                  max: (logUrls.length - 1).toString(),
                  url: route.url.replace(
                    'chffrprivate.blob.core.windows.net',
                    'chffrprivate.azureedge.net',
                  ),
                },
                remove: [GITHUB_AUTH_TOKEN_KEY],
              }),
            }),
          );
        })
        .catch((err) => {
          console.log(err);
          CommaAuthStorage.logOut().then(() => {
            CommaAuthStorage.isAuthed = false;
            this.showOnboarding();
          });
        });
    } else {
      this.showOnboarding();
    }
  }

  componentWillUnmount() {
    if (this.dataCacheTimer) {
      this.dataCacheTimer();
    }
  }

  downloadLogAsCSV() {
    console.log('downloading csv');
    // console.log('downloadLogAsCSV:start');
    // const { dbcFilename } = this.state;
    // const fileStream = createWriteStream(`${dbcFilename.replace(/\.dbc/g, '-')}${+new Date()}.csv`);
    // const writer = fileStream.getWriter();
    // const encoder = new TextEncoder();

    // if (this.state.live) {
    //   return this.downloadLiveLogAsCSV(dataHandler);
    // }
    // return this.downloadRawLogAsCSV(dataHandler);

    // function dataHandler(e) {
    //   const { logData, shouldClose, progress } = e.data;
    //   if (shouldClose) {
    //     console.log('downloadLogAsCSV:close');
    //     writer.close();
    //     return;
    //   }
    //   console.log('CSV export progress:', progress);
    //   const uint8array = encoder.encode(`${logData}\n`);
    //   writer.write(uint8array);
    // }
  }

  // async downloadDbcFile() {
  //   const blob = new Blob([this.props.dbc.text()], { type: 'text/plain;charset=utf-8' });
  //   const filename = this.state.dbcFilename.replace(/\.dbc/g, '') + '.dbc';
  //   FileSaver.saveAs(blob, filename, true);
  // }

  // downloadRawLogAsCSV(handler) {
  //   return this.downloadLiveLogAsCSV(handler);
  // }

  // downloadLiveLogAsCSV(handler) {
  //   // Trigger processing of in-memory data in worker
  //   // this method *could* just fetch the data needed for the worked, but
  //   // eventually this might be in it's own worker instead of the shared one
  //   const { firstCanTime, canFrameOffset } = this.state;
  //   const worker = new LogCSVDownloader();

  //   worker.onmessage = handler;

  //   worker.postMessage({
  //     data: Object.keys(this.state.messages).map((sourceId) => {
  //       const source = this.state.messages[sourceId];
  //       return {
  //         id: source.id,
  //         bus: source.bus,
  //         address: source.address,
  //         entries: source.entries.slice(),
  //       };
  //     }),
  //     canStartTime: (firstCanTime || 0) - canFrameOffset,
  //   });
  // }

  onDbcSaved(dbcFilename: string) {
    const dbcLastSaved = moment();
    this.setState({ dbcLastSaved, dbcFilename });
    this.hideSaveDbc();
  }

  onDbcSelected(dbcFilename: string, dbc: DBC) {
    const { route } = this.state;
    this.hideLoadDbc();
    dbc.lastUpdated = Date.now();
    this.persistDbc({ dbcFilename, dbc });

    if (route) {
      this.setState(
        {
          dbc,
          dbcFilename,
          dbcText: dbc.text(),
          partsLoaded: 0,
          selectedMessage: null,
          messages: {},
        },
        () => {
          this.loadMessagesFromCache();
        },
      );
    } else {
      this.setState({
        dbc,
        dbcFilename,
        dbcText: dbc.text(),
        messages: {},
      });
    }
  }

  async getParseSegment(part: number) {
    if (!dataCache[part]) {
      return null;
    }
    if (dataCache[part].promise) {
      await dataCache[part].promise;
    }
    dataCache[part].promise = this.getParseSegmentInternal(part);

    return dataCache[part].promise;
  }

  async getParseSegmentInternal(part: number) {
    const start = performance.now();
    const { dbc } = this.state;
    if (!dbc.lastUpdated) {
      dbc.lastUpdated = Date.now();
    }
    const { lastUpdated } = dbc;
    let { messages } = dataCache[part];

    let reparseMessages: Messages = {};

    Object.keys(messages).forEach((key) => {
      if (messages[key].lastUpdated >= lastUpdated) {
        return;
      }
      reparseMessages[key] = messages[key];
    });

    if (Object.keys(reparseMessages).length) {
      console.log('Reparsing messages!', Object.keys(reparseMessages).length);
      reparseMessages = await this.reparseMessages(reparseMessages);
    }

    messages = {
      ...messages,
      ...reparseMessages,
    };

    dataCache[part].messages = messages;

    const end = performance.now();
    if (end - start > 200) {
      // warn about anything over 200ms
      console.warn('getParseSegment took', part, end - start, Object.keys(messages).length);
    }

    return dataCache[part];
  }

  spawnWorker(options?: SpawnWorkerOptions) {
    const { currentParts } = this.state;
    let { currentWorkers, loadingParts } = this.state;
    console.log('Checking worker for', currentParts);
    if (loadingParts.length > 1) {
      // only 2 workers at a time pls
      return;
    }
    const [minPart, maxPart] = currentParts;

    // updated worker list (post canceling, and this time a copy)
    currentWorkers = { ...this.state.currentWorkers };

    const { loadedParts, currentPart } = this.state;

    let part = -1;
    const allWorkerParts = loadingParts.concat(loadedParts);

    for (let partOffset = 0; partOffset <= maxPart - minPart; ++partOffset) {
      let tempPart = currentPart + partOffset;
      if (tempPart > maxPart) {
        tempPart = minPart + ((tempPart - minPart) % (maxPart - minPart + 1));
      }
      if (allWorkerParts.indexOf(tempPart) === -1) {
        part = tempPart;
        break;
      }
    }
    if (part === -1) {
      return;
    }

    console.log('Starting worker for part', part);
    // options is object of {part, prevMsgEntries, spawnWorkerHash, prepend}
    options = options || {};
    let { prevMsgEntries } = options;
    const prepend = false;

    const { dbc, route, firstCanTime, canFrameOffset } = this.state;
    let { maxByteStateChangeCount } = this.state;

    if (!prevMsgEntries) {
      // we have previous messages loaded
      const { messages } = this.state;
      prevMsgEntries = {};
      Object.keys(messages).forEach((key) => {
        const { entries } = messages[key];
        prevMsgEntries![key] = entries[entries.length - 1];
      });
    }

    // var worker = new CanFetcher();
    const worker = new RawLogDownloader();

    const spawnWorkerHash = hash(Math.random().toString(16));
    currentWorkers[spawnWorkerHash] = {
      part,
      worker,
    };

    loadingParts = [part, ...loadingParts];

    this.setState({
      currentWorkers,
      loadingParts,
    });

    worker.onmessage = (e: MessageEvent<RawLogWorkerOutput>) => {
      if (this.state.currentWorkers[spawnWorkerHash] === undefined) {
        console.log('Worker was canceled');
        return;
      }

      maxByteStateChangeCount = e.data.maxByteStateChangeCount;
      const { newMessages, newThumbnails, isFinished, routeInitTime, firstFrameTime } = e.data;
      if (maxByteStateChangeCount > this.state.maxByteStateChangeCount) {
        this.setState({ maxByteStateChangeCount });
      } else {
        maxByteStateChangeCount = this.state.maxByteStateChangeCount;
      }
      if (routeInitTime !== this.state.routeInitTime) {
        this.setState({ routeInitTime });
      }
      if (firstFrameTime && firstFrameTime !== this.state.firstFrameTime) {
        this.setState({ firstFrameTime });
      }

      if (newMessages) {
        this.addMessagesToDataCache(part, newMessages, newThumbnails);
      }

      if (isFinished) {
        const newLoadingParts = loadingParts.filter((p) => p !== part);
        const newLoadedParts = [part, ...loadedParts];
        const { partsLoaded } = this.state;

        this.setState(
          {
            partsLoaded: partsLoaded + 1,
            loadingParts: newLoadingParts,
            loadedParts: newLoadedParts,
          },
          () => {
            this.spawnWorker({
              prevMsgEntries,
              spawnWorkerHash,
              prepend,
            });
          },
        );
      }
    };

    worker.postMessage({
      // old stuff for reverse compatibility for easier testing
      base: route?.url,
      num: part,

      // so that we don't try to read metadata about it...
      isDemo: this.props.isDemo,
      isLegacyShare: this.props.isLegacyShare,
      logUrls: this.state.logUrls,

      // data that is used
      dbcText: dbc.text(),
      route: route?.fullname,
      part,
      canStartTime: firstCanTime != null ? firstCanTime - canFrameOffset : null,
      prevMsgEntries,
      maxByteStateChangeCount,
    });
  }

  addAndRehydrateMessages(newMessages: Messages, options: any = {}) {
    // Adds new message entries to messages state
    // and "rehydrates" ES6 classes (message frame)
    // lost from JSON serialization in webworker data cloning.
    // handles merging the data in correct order

    const messages = { ...this.state.messages };

    Object.keys(newMessages).forEach((key) => {
      // add message
      if (options.replace !== true && key in messages) {
        // should merge here instead of concat
        // assumes messages are always sequential
        const msgEntries = messages[key].entries;
        const newMsgEntries = newMessages[key].entries;
        const msgLength = msgEntries.length;
        const newMsgLength = newMsgEntries.length;
        const entryLength = msgLength + newMsgLength;
        messages[key] = {
          ...messages[key],
          entries: Array(entryLength),
        };

        let msgIndex = 0;
        let newMsgIndex = 0;

        for (let i = 0; i < entryLength; ++i) {
          if (newMsgIndex >= newMsgLength) {
            messages[key].entries[i] = msgEntries[msgIndex++];
          } else if (msgIndex >= msgLength) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex++];
          } else if (msgEntries[msgIndex].relTime <= newMsgEntries[newMsgIndex].relTime) {
            messages[key].entries[i] = msgEntries[msgIndex++];
          } else if (msgEntries[msgIndex].relTime >= newMsgEntries[newMsgIndex].relTime) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex++];
          }
        }
        messages[key].byteStateChangeCounts = newMessages[key].byteStateChangeCounts;
      } else {
        messages[key] = newMessages[key];
        messages[key].frame = this.state.dbc.getMessageFrame(messages[key].address);
      }
    });

    const maxByteStateChangeCount = DBCUtils.findMaxByteStateChangeCount(messages);
    this.setState({
      maxByteStateChangeCount,
    });

    Object.keys(messages).forEach((key) => {
      // console.log(key);
      messages[key] = DBCUtils.setMessageByteColors(messages[key], maxByteStateChangeCount);
    });

    return messages;
  }

  async addMessagesToDataCache(part: number, newMessages: Messages, newThumbnails: Thumbnail[]) {
    const { dbc, currentParts } = this.state;
    const entry = await this.getParseSegment(part);
    if (!entry) {
      // first chunk of data returned from this segment
      Object.keys(newMessages).forEach((key) => {
        newMessages[key] = this.parseMessageEntry(newMessages[key], dbc);
      });
      dataCache[part] = {
        messages: newMessages,
        thumbnails: newThumbnails,
        lastUpdated: Date.now(),
        lastUsed: Date.now(),
      };
      if (part >= currentParts[0] && part <= currentParts[1]) {
        this.setState({
          messages: this.addAndRehydrateMessages(newMessages),
        });
      }
      return;
    }

    entry.lastUsed = Date.now();

    // data is always append only, and always per segment
    Object.keys(newMessages).forEach((key) => {
      let msgs = newMessages[key];
      if (!dataCache[part].messages[key]) {
        msgs = this.parseMessageEntry(msgs, dbc);
        dataCache[part].messages[key] = msgs;
      } else {
        let { entries } = dataCache[part].messages[key];
        const lastEntry = entries.length ? entries[entries.length - 1] : null;
        msgs = this.parseMessageEntry(msgs, dbc, lastEntry);
        entries = entries.concat(msgs.entries);
        dataCache[part].messages[key].entries = entries;
      }
      newMessages[key] = msgs;
    });
    dataCache[part].thumbnails = dataCache[part].thumbnails.concat(newThumbnails);

    if (part >= currentParts[0] && part <= currentParts[1]) {
      this.setState({
        messages: this.addAndRehydrateMessages(newMessages),
      });
    }
  }

  async loadMessagesFromCache() {
    // create a new messages object for state
    if (this.loadMessagesFromCacheRunning) {
      if (!this.loadMessagesFromCacheTimer) {
        this.loadMessagesFromCacheTimer = timeout(() => this.loadMessagesFromCache(), 10);
      }
      return;
    }
    this.loadMessagesFromCacheRunning = true;
    if (this.loadMessagesFromCacheTimer) {
      this.loadMessagesFromCacheTimer();
      this.loadMessagesFromCacheTimer = null;
    }
    const { currentParts, dbc } = this.state;
    const { lastUpdated } = dbc;
    const [minPart, maxPart] = currentParts;
    const messages: Messages = {};
    let thumbnails: Thumbnail[] = [];
    let isCanceled = false;

    let start = performance.now();

    const promises = [];

    for (let i = minPart, l = maxPart; i <= l; ++i) {
      promises.push(this.getParseSegment(i));
    }
    await promises.reduce(async (prev, p) => {
      await prev;
      if (isCanceled) {
        return;
      }
      const cacheEntry = await p;
      if (this.state.dbc.lastUpdated !== lastUpdated) {
        if (!isCanceled) {
          isCanceled = true;
          this.loadMessagesFromCacheRunning = false;
          console.log('Canceling!');
          this.loadMessagesFromCache();
        }
        return;
      }
      if (cacheEntry) {
        const newMessages = cacheEntry.messages;
        thumbnails = thumbnails.concat(cacheEntry.thumbnails);
        Object.keys(newMessages).forEach((key) => {
          if (!messages[key]) {
            messages[key] = { ...newMessages[key] };
          } else {
            const newMessageEntries = newMessages[key].entries;
            const messageEntries = messages[key].entries;
            if (
              newMessageEntries.length &&
              newMessageEntries[0].relTime < messageEntries[messageEntries.length - 1].relTime
            ) {
              console.error(
                'Found out of order messages',
                newMessageEntries[0],
                messageEntries[messageEntries.length - 1],
              );
            }
            messages[key].entries = messages[key].entries.concat(newMessages[key].entries);
          }
        });
      }
      console.log('Done with', performance.now() - start);
      start = performance.now();
    }, Promise.resolve());

    if (isCanceled) {
      return;
    }

    Object.keys(this.state.messages).forEach((key) => {
      if (!messages[key]) {
        messages[key] = this.state.messages[key];
        messages[key].entries = [];
      }
    });

    Object.keys(messages).forEach((key) => {
      messages[key].frame = dbc.getMessageFrame(messages[key].address);
    });

    const maxByteStateChangeCount = DBCUtils.findMaxByteStateChangeCount(messages);

    this.setState({
      maxByteStateChangeCount,
    });

    Object.keys(messages).forEach((key) => {
      // console.log(key);
      messages[key] = DBCUtils.setMessageByteColors(messages[key], maxByteStateChangeCount);
    });

    console.log('Done with old messages', performance.now() - start);

    this.setState({ messages, thumbnails });

    this.loadMessagesFromCacheRunning = false;
  }

  initCanData() {
    this.spawnWorker();
  }

  async reparseMessages(_messages: Messages): Promise<Messages> {
    const messages = _messages;
    const { dbc } = this.state;
    dbc.lastUpdated = dbc.lastUpdated || Date.now();

    Object.keys(messages).forEach((key) => {
      messages[key].frame = dbc.getMessageFrame(messages[key].address);
    });

    return new Promise((resolve) => {
      const worker = new MessageParser();
      worker.onmessage = (e: MessageEvent<MessageParserWorkerOutput>) => {
        const newMessages = e.data.messages;
        Object.keys(newMessages).forEach((key) => {
          newMessages[key].lastUpdated = dbc.lastUpdated || 0;
          newMessages[key].frame = dbc.getMessageFrame(newMessages[key].address);
        });
        resolve(newMessages);
      };

      worker.postMessage({
        messages,
        dbcText: dbc.text(),
        canStartTime: this.state.firstCanTime,
      });
    });
  }

  showingModal() {
    const { showOnboarding, showLoadDbc, showSaveDbc, showEditMessageModal } = this.state;
    return showOnboarding || showLoadDbc || showSaveDbc || showEditMessageModal;
  }

  showOnboarding() {
    if (
      !CommaAuth.isAuthenticated() &&
      window.sessionStorage &&
      window.location &&
      window.location.pathname !== AuthConfig.AUTH_PATH
    ) {
      window.sessionStorage.setItem('onboardingPath', window.location.href);
    }
    this.setState({ showOnboarding: true });
  }

  hideOnboarding() {
    this.setState({ showOnboarding: false });
  }

  showLoadDbc() {
    this.setState({ showLoadDbc: true });
  }

  hideLoadDbc() {
    this.setState({ showLoadDbc: false });
  }

  showSaveDbc() {
    this.setState({ showSaveDbc: true });
  }

  hideSaveDbc() {
    this.setState({ showSaveDbc: false });
  }

  updateMessageFrame(messageId: string, frame?: IFrame) {
    if (frame) {
      const { messages } = this.state;

      messages[messageId].frame = frame;
      this.setState({ messages });
    }
  }

  persistDbc({ dbcFilename, dbc }: { dbcFilename: string; dbc: DBC }) {
    const { route } = this.state;
    if (route) {
      Storage.persistDbc(route.fullname, dbcFilename, dbc);
    } else {
      Storage.persistDbc('live', dbcFilename, dbc);
    }

    this.loadMessagesFromCache();
  }

  onConfirmedSignalChange(message: Message, signals: { [key: string]: any }) {
    const { dbc, dbcFilename } = this.state;
    const frameSize = DBCUtils.maxMessageSize(message);
    dbc.setSignals(message.address, { ...signals }, frameSize);

    this.persistDbc({ dbcFilename, dbc });

    this.updateMessageFrame(message.id, dbc.getMessageFrame(message.address));

    this.setState({ dbc, dbcText: dbc.text() }, () => {
      this.decacheMessageId(message.id);
      this.loadMessagesFromCache();
    });
  }

  partChangeDebounced = debounce(() => {
    this.loadMessagesFromCache();

    this.spawnWorker();
  }, 500);

  onPartChange(part: number) {
    const { canFrameOffset, route } = this.state;
    let { currentParts, currentPart } = this.state;
    if (canFrameOffset === -1 || part === currentPart) {
      return;
    }

    // determine new parts to load, whether to prepend or append
    let maxPart = Math.min(route?.proclog || Infinity, part + 1);
    const minPart = Math.max(0, maxPart - PART_SEGMENT_LENGTH + 1);
    if (minPart === 0) {
      maxPart = Math.min(route?.proclog || Infinity, 2);
    }

    // update current parts
    currentParts = [minPart, maxPart];
    currentPart = part;

    if (
      currentPart !== this.state.currentPart ||
      currentParts[0] !== this.state.currentParts[0] ||
      currentParts[1] !== this.state.currentParts[1]
    ) {
      // update state then load new parts
      this.setState({ currentParts, currentPart }, this.partChangeDebounced);
    }
  }

  showEditMessageModal(msgKey: string) {
    const msg = this.state.messages[msgKey];
    console.log(msg);
    if (!msg.frame) {
      msg.frame = this.state.dbc.createFrame(msg.address); // TODO frameSize
    }

    this.setState({
      showEditMessageModal: true,
      editMessageModalMessage: msgKey,
    });
  }

  hideEditMessageModal() {
    this.setState({ showEditMessageModal: false });
  }

  onMessageFrameEdited(messageFrame: IFrame) {
    const { messages, dbcFilename, dbc, editMessageModalMessage } = this.state;
    if (editMessageModalMessage) {
      const message = { ...messages[editMessageModalMessage] };
      message.frame = messageFrame;
      dbc.messages.set(messageFrame.id, messageFrame);
      this.persistDbc({ dbcFilename, dbc });

      messages[editMessageModalMessage] = message;
      this.setState({ messages, dbc, dbcText: dbc.text() });
      this.hideEditMessageModal();
    }
  }

  onSeek(seekIndex: number, seekTime: number) {
    this.setState({ seekIndex, seekTime });

    const { currentPart } = this.state;
    const part = ~~(seekTime / 60);
    if (part !== currentPart) {
      this.onPartChange(part);
    }
  }

  onUserSeek(seekTime: number) {
    const { dongleId, name, unlogger } = this.props;
    const { selectedMessage } = this.state;

    if (unlogger && dongleId && name) {
      this.unloggerClient!.seek(dongleId, name, seekTime);
    }

    const msg = this.state.messages[selectedMessage || ''];
    let seekIndex;
    if (msg) {
      seekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
      if (seekIndex === -1) {
        seekIndex = 0;
      }
    } else {
      seekIndex = 0;
    }

    this.onSeek(seekIndex, seekTime);
  }

  onMessageSelected(msgKey: string) {
    let { seekTime, seekIndex } = this.state;
    const msg = this.state.messages[msgKey];

    if (seekTime > 0 && msg.entries.length > 0) {
      seekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
      if (seekIndex === -1) {
        seekIndex = 0;
      }

      seekTime = msg.entries[seekIndex].relTime;
    }

    this.setState({ seekTime, seekIndex, selectedMessage: msgKey });
  }

  updateSelectedMessages(selectedMessages: string[]) {
    this.setState({ selectedMessages });
  }

  onMessageUnselected() {
    this.setState({ selectedMessage: null });
  }

  processStreamedCanMessages(newCanMessages: TimedCanMessages) {
    const { dbcText } = this.state;
    const { firstCanTime, lastBusTime, messages, maxByteStateChangeCount } = this.state;
    // map msg id to arrays
    const prevMsgEntries = Object.entries(messages).reduce(this.lastMessageEntriesById, {});

    const byteStateChangeCountsByMessage = Object.entries(messages).reduce((obj, [msgId, msg]) => {
      obj[msgId] = msg.byteStateChangeCounts;
      return obj;
    }, {} as ByteStateChangeCounts);

    this.canStreamerWorker?.postMessage({
      newCanMessages,
      prevMsgEntries,
      firstCanTime,
      dbcText,
      lastBusTime,
      byteStateChangeCountsByMessage,
      maxByteStateChangeCount,
    });
  }

  enforceStreamingMessageWindow(messages: Messages) {
    const messageIds = Object.keys(messages);
    for (let i = 0; i < messageIds.length; i++) {
      const messageId = messageIds[i];
      const message = messages[messageId];
      if (message.entries.length < 2) {
        continue;
      }

      const lastEntryTime = message.entries[message.entries.length - 1].relTime;
      const entrySpan = lastEntryTime - message.entries[0].relTime;
      if (entrySpan > STREAMING_WINDOW) {
        const newEntryFloor = this.firstEntryIndexInsideStreamingWindow(message.entries);
        message.entries = message.entries.slice(newEntryFloor);
        messages[messageId] = message;
      }
    }

    return messages;
  }

  onStreamedCanMessagesProcessed({ data }: MessageEvent<CanWorkerOutput>) {
    const { newMessages, seekTime, lastBusTime, firstCanTime } = data;
    let { maxByteStateChangeCount } = data;

    if (maxByteStateChangeCount < this.state.maxByteStateChangeCount) {
      maxByteStateChangeCount = this.state.maxByteStateChangeCount;
    }

    let messages = this.addAndRehydrateMessages(newMessages);
    messages = this.enforceStreamingMessageWindow(messages);
    let { seekIndex } = this.state;
    const { selectedMessages } = this.state;
    if (selectedMessages.length > 0 && messages[selectedMessages[0]] !== undefined) {
      seekIndex = Math.max(0, messages[selectedMessages[0]].entries.length - 1);
    }
    this.setState({
      messages,
      seekTime,
      seekIndex,
      lastBusTime,
      firstCanTime,
      maxByteStateChangeCount,
    });
  }

  async handlePandaConnect() {
    this.setState({ attemptingPandaConnection: true, live: true });

    const persistedDbc = Storage.fetchPersistedDBC('live');
    if (persistedDbc) {
      const { dbc, dbcText } = persistedDbc;
      this.setState({ dbc, dbcText });
    }
    this.canStreamerWorker = new CanStreamer();
    this.canStreamerWorker!.onmessage = this.onStreamedCanMessagesProcessed;

    // if any errors go off during connection, mark as not trying to connect anymore...
    // const unlisten = this.pandaReader!.onError((err) => {
    //   console.error(err.stack || err);
    //   this.setState({ attemptingPandaConnection: false });
    // });
    try {
      await this.pandaReader!.start();
      this.setState({
        showOnboarding: false,
        showLoadDbc: true,
      });
    } finally {
      this.setState({ attemptingPandaConnection: false });
    }
    // TODO: why doesn't this compile in TS?
    // const unlisten = panda?.onError((err: Error) => {
    //   console.error(err.stack || err);
    //   setAttemptingPandaConnection(false);
    // });
  }

  githubSignOut(e: Event) {
    Storage.unpersistGithubAuthToken();
    this.setState({ isGithubAuthenticated: false });

    e.preventDefault();
  }

  firstEntryIndexInsideStreamingWindow(entries: MessageEntry[]) {
    const lastEntryTime = entries[entries.length - 1].relTime;
    const windowFloor = lastEntryTime - STREAMING_WINDOW;

    for (let i = 0; i < entries.length; i++) {
      if (entries[i].relTime > windowFloor) {
        return i;
      }
    }

    return 0;
  }

  decacheMessageId(messageId: string) {
    Object.keys(dataCache).forEach((part) => {
      const partNumber = parseInt(part, 10);
      if (dataCache[partNumber].messages[messageId]) {
        dataCache[partNumber].messages[messageId].lastUpdated = 0;
      }
    });
  }

  parseMessageEntry(_message: Message, dbc: DBC, lastMsg: MessageEntry | null = null) {
    const message = _message;
    dbc.lastUpdated = dbc.lastUpdated || Date.now();
    message.lastUpdated = dbc.lastUpdated;
    message.frame = dbc.getMessageFrame(message.address);

    let prevMsgEntry = lastMsg;
    const byteStateChangeCounts: number[][] = [];

    message.entries = message.entries.map((entry) => {
      const internalEntry = entry.hexData
        ? DBCUtils.reparseMessage(dbc, entry, prevMsgEntry)
        : DBCUtils.parseMessage(
            dbc,
            entry.time,
            entry.address,
            entry.data,
            entry.timeStart,
            prevMsgEntry,
          );
      byteStateChangeCounts.push(internalEntry.byteStateChangeCounts);
      prevMsgEntry = internalEntry.msgEntry;
      return prevMsgEntry as MessageEntry;
    });
    message.byteStateChangeCounts = byteStateChangeCounts.reduce((memo, val) => {
      if (!memo) {
        return val;
      }
      return memo.map((count, idx) => val[idx] + count);
    });

    return message;
  }

  lastMessageEntriesById(obj: { [key: string]: MessageEntry }, [msgId, message]: MessageTuple) {
    obj[msgId] = message.entries[message.entries.length - 1];
    return obj;
  }

  render() {
    const {
      route,
      messages,
      selectedMessages,
      currentParts,
      dbcFilename,
      dbcLastSaved,
      seekTime,
      seekIndex,
      shareUrl,
      live,
      thumbnails,
      selectedMessage,
      firstCanTime,
    } = this.state;

    const { startTime, segments, isDemo } = this.props;

    return (
      <VStack h="calc(100vh - 76px)" w="100vw" spacing={0}>
        <Flex as="nav" w="full">
          <Navigation
            route={route}
            showingLoadDbc={this.showLoadDbc}
            showingSaveDbc={this.showSaveDbc}
            saveLog={debounce(this.downloadLogAsCSV, 500)}
          />
        </Flex>
        <Flex h="full">
          <HStack w="100vw" spacing={0}>
            <Flex as="aside" direction="column" h="full" w="full" maxWidth={530} overflow="scroll">
              <MessageList
                messages={messages}
                selectedMessages={selectedMessages}
                showEditMessageModal={this.showEditMessageModal}
                currentParts={currentParts}
                onMessageSelected={this.onMessageSelected}
                onMessageUnselected={this.onMessageUnselected}
                dbcFilename={dbcFilename}
                dbcLastSaved={dbcLastSaved}
                route={route}
                seekTime={seekTime}
                seekIndex={seekIndex}
                shareUrl={shareUrl}
                isDemo={isDemo}
                isLive={live}
              />
            </Flex>
            {/* <Flex
            as="aside"
            h="full"
            w="full"
            direction="column"
            borderRightColor={borderColor}
            borderRightWidth={1}
            boxShadow="lg"
            p={3}
            overflow="scroll"
          >
            <Button
              size="xs"
              py={4}
              variant="solid"
              textAlign="start"
              w="full"
              leftIcon={<FaRegEdit />}
            >
              STEER_ANGLE_SENSOR
            </Button>
          </Flex> */}
            {route || live ? (
              <Flex as="main" h="full" w="full" overflow="scroll">
                <Video
                  autoplay={this.props.autoplay}
                  currentParts={currentParts}
                  firstCanTime={firstCanTime}
                  maxqcamera={route ? route.maxqcamera : 0}
                  messages={messages}
                  routeStartTime={route ? route.start_time : moment()}
                  seekIndex={seekIndex}
                  selectedMessage={selectedMessage}
                  startTime={startTime}
                  startSegments={segments}
                  thumbnails={thumbnails}
                  url={route ? route.url : null}
                  videoOffset={
                    this.state.firstFrameTime && this.state.routeInitTime
                      ? this.state.firstFrameTime - this.state.routeInitTime
                      : 0
                  }
                  onSeek={this.onSeek}
                  onUserSeek={this.onUserSeek}
                />
              </Flex>
            ) : null}
          </HStack>
        </Flex>
      </VStack>
    );
  }
}

export type Props = {
  autoplay: boolean;
  startTime: number;
  segments: number[] | undefined;
  isDemo: boolean;
  dongleId?: string;
  name?: string;
  max?: number;
  url?: string;
  exp?: string;
  sig?: string;
  isLegacyShare?: boolean;
  dbc?: DBC;
  dbcFilename?: string;
  githubAuthToken?: string;
  unlogger: boolean;
};

export type State = {
  messages: Messages;
  thumbnails: Thumbnail[];
  selectedMessages: string[];
  route: Route | null;
  canFrameOffset: number;
  routeInitTime: number;
  firstFrameTime: number;
  firstCanTime: number | null;
  lastBusTime: number | null;
  selectedMessage: string | null;
  currentParts: [number, number];
  currentPart: number;
  currentWorkers: WorkerHashMap;
  spawnWorkerHash: string | null;
  loadingParts: number[];
  loadedParts: number[];
  showOnboarding: boolean;
  showLoadDbc: boolean;
  showSaveDbc: boolean;
  showEditMessageModal: boolean;
  editMessageModalMessage: string | null;
  dbc: DBC;
  dbcText: string;
  dbcFilename: string;
  dbcLastSaved: moment.Moment | null;
  seekTime: number;
  seekIndex: number;
  maxByteStateChangeCount: number;
  partsLoaded: number;
  attemptingPandaConnection: boolean;
  live: boolean;
  isGithubAuthenticated: boolean;
  shareUrl: string | null;
  logUrls: string[] | null;
};
