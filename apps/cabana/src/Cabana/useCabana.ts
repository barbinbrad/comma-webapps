/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { raw as RawDataApi, drives as DrivesApi } from 'api';
import CommaAuth, { storage as CommaAuthStorage, config as AuthConfig } from 'auth';
import moment from 'moment';
import PandaAPI from 'panda';
import Panda from 'panda/dist/module/lib/panda'; // TODO: type should come from main package
import { PART_SEGMENT_LENGTH, STREAMING_WINDOW, GITHUB_AUTH_TOKEN_KEY } from '../config';
import { demoLogUrls, demoRoute } from '../data/demo';
import useInterval from '../hooks/useInterval';
import DBC from '../models/dbc';
import DBCUtils from '../models/dbc/utils';
import Storage from '../services/localStorage/localStorage';
import OpenDbcClient from '../services/opendbc';
import UnloggerClient from '../services/unlogger/unlogger';
import { Props } from './types';
import {
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
  RawLogWorkerInput,
  RawLogWorkerOutput,
  Route,
  SharedSignature,
  SpawnWorkerOptions,
  WorkerHashMap,
} from '../types';
import { hash } from '../utils/string';
import { modifyQueryParameters } from '../utils/url';

import CanStreamer from '../workers/CanStreamerWorker?worker';
import MessageParser from '../workers/MessageParserWorker?worker';
import RawLogDownloader from '../workers/RawLogDownloader?worker';

const dataCache: { [key: number]: DataCache } = {};

export default function useCabana(props: Props) {
  const { dongleId, githubAuthToken, isDemo, isLegacyShare, name, unlogger } = props;
  const { colorMode } = useColorMode();
  const borderColor = colorMode !== 'dark' ? 'gray.200' : 'whiteAlpha.300';
  const isMounted = useRef(false);
  const [messages, setMessages] = useState<Messages>({});
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [canFrameOffset, setCanFrameOffset] = useState(0);
  const [routeInitTime, setRouteInitTime] = useState(0);
  const [firstFrameTime, setFirstFrameTime] = useState(0);
  const [firstCanTime, setFirstCanTime] = useState<number | null>(null);
  const [lastBusTime, setLastBusTime] = useState<number | null>(null);
  const [currentParts, setCurrentParts] = useState<[number, number]>([0, 0]);
  const [currentPart, setCurrentPart] = useState(0);
  const [currentWorker, setCurrentWorker] = useState<string | null>(null);
  const [currentWorkers, setCurrentWorkers] = useState<WorkerHashMap>({});
  const [loadingParts, setLoadingParts] = useState<number[]>([]);
  const [loadedParts, setLoadedParts] = useState<number[]>([]);
  const [loadMessagesFromCacheRunning, setLoadMessagesFromCacheRunning] = useState(false);
  const [showingOnboarding, setShowingOnboarding] = useState(false);
  const [showingLoadDbc, setShowingLoadDbc] = useState(false);
  const [showingSaveDbc, setShowingSaveDbc] = useState(false);
  const [showingEditMessageModal, setShowingEditMessageModal] = useState(false);
  const [editMessageModalMessage, setEditMessageModalMessage] = useState<string | null>(null);
  // TODO: dbc, and dbcText should be refactored to a useDBC() hook
  const [dbc, setDbc] = useState(props.dbc ? props.dbc : new DBC());
  const [dbcText, setDbcText] = useState(props.dbc ? props.dbc.text() : new DBC().text());
  const [dbcFilename, setDbcFilename] = useState(props.dbcFilename ? props.dbcFilename : 'New_DBC');
  const [dbcLastSaved, setDbcLastSaved] = useState(null);
  const [seekTime, setSeekTime] = useState(props.startTime || 0);
  const [seekIndex, setSeekIndex] = useState(0);
  const [maxByteStateChangeCount, setMaxByteStateChangeCount] = useState(0);
  const [partsLoaded, setPartsLoaded] = useState(0);
  const [spawnWorkerHash, setSpawnWorkerHash] = useState(null);
  const [attemptingPandaConnection, setAttemptingPandaConnection] = useState(false);
  const [pandaNoDeviceSelected, setPandaNoDeviceSelected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isGithubAuthenticated, setIsGithubAuthenticated] = useState(
    githubAuthToken !== null && githubAuthToken !== undefined,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [logUrls, setLogUrls] = useState<string[] | null>(null);

  const [panda, setPanda] = useState<Panda>();
  const openDbcClient = useRef<OpenDbcClient>();
  const unloggerClient = useRef<UnloggerClient>();
  const canStreamer = useRef<Worker>();

  useEffect(() => {
    initializeUnlogger();
    initializePanda();

    async function initializePanda() {
      const webUSB = await PandaAPI({});
      setPanda(webUSB);
    }

    function initializeUnlogger() {
      if (unlogger) {
        unloggerClient.current = new UnloggerClient();
      }
    }
  }, []);

  useEffect(() => {
    const { url, max, sig, exp } = props;
    if (CommaAuth.isAuthenticated() && !name) {
      showOnboardingState();
    } else if (isDemo) {
      setLogUrls(demoLogUrls);
      setCurrentParts([0, 2]);
      setCurrentPart(0);
      setRoute(demoRoute);
    } else if (isLegacyShare) {
      const startTime = moment(name, 'YYYY-MM-DD--H-m-s');

      setCurrentParts([0, Math.min(max || 0, PART_SEGMENT_LENGTH - 1)]);
      setRoute({
        fullname: `${dongleId}|${name}`,
        proclog: max,
        url,
        start_time: startTime,
      });
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
          const [routeResult, logUrlsResult] = initData;
          setCurrentParts([0, Math.min(logUrlsResult.length - 1, PART_SEGMENT_LENGTH - 1)]);
          setRoute({
            fullname: routeName,
            proclog: logUrlsResult.length - 1,
            start_time: moment(name, 'YYYY-MM-DD--H-m-s'),
            url: routeResult.url.replace(
              'chffrprivate.blob.core.windows.net',
              'chffrprivate.azureedge.net',
            ),
            maxqcamera: routeResult.maxqcamera ? routeResult.maxqcamera : logUrlsResult.length - 1,
          });

          setLogUrls(logUrlsResult);

          DrivesApi.getShareSignature(routeName).then((shareSignature: SharedSignature) =>
            setShareUrl(
              modifyQueryParameters({
                add: {
                  exp: shareSignature.exp.toString(),
                  sig: shareSignature.sig.toString(),
                  max: (logUrlsResult.length - 1).toString(),
                  url: routeResult.url.replace(
                    'chffrprivate.blob.core.windows.net',
                    'chffrprivate.azureedge.net',
                  ),
                },
                remove: [GITHUB_AUTH_TOKEN_KEY],
              }),
            ),
          );
        })
        .catch((err) => {
          console.error(err);
          CommaAuthStorage.logOut().then(() => {
            CommaAuthStorage.isAuthed = false;
            showOnboardingState();
          });
        });
    } else {
      showOnboardingState();
    }
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      spawnWorker();
    } else {
      isMounted.current = true;
    }
  }, [currentParts, partsLoaded]);

  useEffect(() => {
    if (githubAuthToken) {
      openDbcClient.current = new OpenDbcClient(githubAuthToken);
    }
  }, [githubAuthToken]);

  useEffect(() => {
    if (panda) {
      panda.onMessage(processStreamedCanMessages);
    }
  }, [panda]);

  useEffect(() => {
    if (currentWorker) {
      console.log(`starting currentWorker ${currentWorker}`);
      const { part, worker, prevMsgEntries } = currentWorkers[currentWorker];

      worker.onmessage = onRLogMessagesProcessed(currentWorker, prevMsgEntries);
      const rawlog: RawLogWorkerInput = {
        // old stuff for reverse compatibility for easier testing
        base: route?.url,
        num: part,

        // so that we don't try to read metadata about it...
        isDemo,
        isLegacyShare,
        logUrls,

        // data that is used
        dbcText: dbc.text(),
        route: route?.fullname!,
        part,
        canStartTime: firstCanTime != null ? firstCanTime - canFrameOffset : null,
        prevMsgEntries,
        maxByteStateChangeCount,
        routeInitTime: null,
        firstFrameTime: null,
      };
      worker.postMessage(rawlog);
    }
  }, [currentWorker, currentWorkers]);

  useInterval(() => {
    if (loadMessagesFromCacheRunning || loadedParts.length < 4) {
      return;
    }

    loadedParts.forEach((part) => {
      if (part >= currentParts[0] && part <= currentParts[1]) {
        return;
      }
      if (Date.now() - dataCache[part].lastUsed > 3 * 60 * 1000) {
        console.log('Decaching part', part);
        setLoadedParts((prevParts) => prevParts.filter((p) => p !== part));
        delete dataCache[part];
      }
    });
  }, 10000);

  const showOnboardingState = useCallback(() => {
    if (
      !CommaAuth.isAuthenticated() &&
      window.sessionStorage &&
      window.location &&
      window.location.pathname !== AuthConfig.AUTH_PATH
    ) {
      window.sessionStorage.setItem('onboardingPath', window.location.href);
    }
    setShowingOnboarding(true);
  }, [setShowingOnboarding]);

  const spawnWorker = useCallback(
    (options: SpawnWorkerOptions = {}) => {
      console.log('Checking worker for', currentParts);
      if (loadingParts.length > 1) {
        // only 2 workers at a time
        return;
      }

      const [minPart, maxPart] = currentParts;

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
      let { prevMsgEntries } = options || {};

      if (!prevMsgEntries) {
        prevMsgEntries = {};
        Object.keys(messages).forEach((key) => {
          const { entries } = messages[key];
          prevMsgEntries![key] = entries[entries.length - 1];
        });
      }

      const worker = new RawLogDownloader();
      const workerHash = hash(Math.random().toString(16));

      setLoadingParts([part, ...loadingParts]);
      setCurrentWorker(workerHash);
      setCurrentWorkers((prevWorkers) => {
        return {
          ...prevWorkers,
          [workerHash]: {
            part,
            worker,
            prevMsgEntries,
          },
        };
      });
    },
    [
      currentPart,
      currentParts,
      currentWorkers,
      loadingParts,
      loadedParts,
      messages,
      dbc,
      route,
      firstCanTime,
      canFrameOffset,
      maxByteStateChangeCount,
    ],
  );

  const processStreamedCanMessages = useCallback(
    (newCanMessages: TimedCanMessages) => {
      const prevMsgEntries = Object.entries(messages).reduce(getLastMessageEntriesById, {});

      const byteStateChangeCountsByMessage = Object.entries(messages).reduce(
        (obj, [msgId, msg]) => {
          obj[msgId] = msg.byteStateChangeCounts;
          return obj;
        },
        {} as ByteStateChangeCounts,
      );

      canStreamer.current?.postMessage({
        newCanMessages,
        prevMsgEntries,
        firstCanTime,
        dbcText,
        lastBusTime,
        byteStateChangeCountsByMessage,
        maxByteStateChangeCount,
      });
    },
    [messages],
  );

  const getLastMessageEntriesById = (
    obj: { [key: string]: MessageEntry },
    [msgId, message]: MessageTuple,
  ) => {
    obj[msgId] = message.entries[message.entries.length - 1];
    return obj;
  };

  const handlePandaConnect = async () => {
    setAttemptingPandaConnection(true);
    setIsLive(true);

    const persistedDbc = Storage.fetchPersistedDBC('live');
    if (persistedDbc) {
      setDbc(persistedDbc.dbc);
      setDbcText(persistedDbc.dbcText);
    }

    if (canStreamer.current === undefined) {
      canStreamer.current = new CanStreamer();
      canStreamer.current.onmessage = onStreamedCanMessagesProcessed;
    }

    // // if any errors go off during connection, mark as not trying to connect anymore...
    // TODO: why doesn't this compile in TS?
    // const unlisten = panda?.onError((err: Error) => {
    //   console.error(err.stack || err);
    //   setAttemptingPandaConnection(false);
    // });

    try {
      await panda?.start();
      setShowingOnboarding(false);
      setShowingLoadDbc(true);
    } finally {
      setAttemptingPandaConnection(false);
    }

    // if (unlisten) unlisten();
  };

  const addMessagesToDataCache = useCallback(
    async (part: number, newMessages: Messages, newThumbnails: Thumbnail[]) => {
      const entry = await getParseSegment(part);
      if (!entry) {
        // first chunk of data returned from this segment
        Object.keys(newMessages).forEach((key) => {
          newMessages[key] = parseMessageEntry(newMessages[key]);
        });
        dataCache[part] = {
          messages: newMessages,
          thumbnails: newThumbnails,
          lastUpdated: Date.now(),
          lastUsed: Date.now(),
        };
        if (part >= currentParts[0] && part <= currentParts[1]) {
          setMessages((prevMessages) => addAndRehydrateMessages(prevMessages, newMessages));
        }
        return;
      }

      entry.lastUsed = Date.now();

      // data is always append only, and always per segment
      Object.keys(newMessages).forEach((key) => {
        let msgs = newMessages[key];
        if (!dataCache[part].messages[key]) {
          msgs = parseMessageEntry(msgs);
          dataCache[part].messages[key] = msgs;
        } else {
          let { entries } = dataCache[part].messages[key];
          const lastEntry = entries.length ? entries[entries.length - 1] : null;
          msgs = parseMessageEntry(msgs, lastEntry);
          entries = entries.concat(msgs.entries);
          dataCache[part].messages[key].entries = entries;
        }
        newMessages[key] = msgs;
      });
      dataCache[part].thumbnails = dataCache[part].thumbnails.concat(newThumbnails);

      if (part >= currentParts[0] && part <= currentParts[1]) {
        setMessages((prevMessages) => addAndRehydrateMessages(prevMessages, newMessages));
      }
    },
    [currentParts, dbc, setMessages],
  );

  const onRLogMessagesProcessed = useCallback(
    (workerHash: string, prevMsgEntries: { [key: string]: MessageEntry } = {}) =>
      ({ data }: MessageEvent<RawLogWorkerOutput>) => {
        if (currentWorkers[workerHash] === undefined) {
          console.log('Worker was canceled');
          return;
        }

        const { part } = currentWorkers[workerHash];

        if (data.maxByteStateChangeCount > maxByteStateChangeCount) {
          setMaxByteStateChangeCount(data.maxByteStateChangeCount);
        }

        if (data.routeInitTime !== routeInitTime) {
          setRouteInitTime(data.routeInitTime);
        }
        if (data.firstFrameTime && data.firstFrameTime !== firstFrameTime) {
          setFirstFrameTime(data.firstFrameTime);
        }

        if (data.newMessages && Object.keys(data.newMessages).length) {
          addMessagesToDataCache(part, data.newMessages, data.newThumbnails);
        }

        if (data.isFinished) {
          setLoadingParts((prevLoadingParts) => prevLoadingParts.filter((p) => p !== part));
          setLoadedParts((prevLoadedParts) => [part, ...prevLoadedParts]);
          setPartsLoaded((prevPartsLoaded) => prevPartsLoaded + 1);

          // TODO: do we need this?
          // if (window.dataCallback) {
          //   window.dataCallback();
          //   window.dataCallback = null;
          // }
        }
      },
    [
      currentWorkers,
      routeInitTime,
      firstFrameTime,
      maxByteStateChangeCount,
      addMessagesToDataCache,
    ],
  );

  useEffect(() => {
    // Update the message handlers when any dependencies change
    Object.keys(currentWorkers).forEach((workerHash) => {
      const { worker, prevMsgEntries } = currentWorkers[workerHash];
      worker.onmessage = onRLogMessagesProcessed(workerHash, prevMsgEntries);
    });
  }, [currentWorkers, onRLogMessagesProcessed]);

  const onStreamedCanMessagesProcessed = useCallback(
    ({ data }: MessageEvent<CanWorkerOutput>) => {
      setMessages((prevMessages) => {
        const newMessages = enforceStreamingMessageWindow(
          addAndRehydrateMessages(prevMessages, data.newMessages),
        );
        if (selectedMessages.length > 0 && newMessages[selectedMessages[0]] !== undefined) {
          setSeekIndex(Math.max(0, newMessages[selectedMessages[0]].entries.length - 1));
        }
        return newMessages;
      });

      setSeekTime(data.seekTime);
      setLastBusTime(data.lastBusTime);
      setFirstCanTime(data.firstCanTime);
      setMaxByteStateChangeCount((prevMax) =>
        data.maxByteStateChangeCount > prevMax ? data.maxByteStateChangeCount : prevMax,
      );
    },
    [seekIndex, selectedMessages, setMessages, setMaxByteStateChangeCount],
  );

  const enforceStreamingMessageWindow = useCallback((currentMessages: Messages) => {
    const messageIds = Object.keys(messages);
    for (let i = 0; i < messageIds.length; i++) {
      const messageId = messageIds[i];
      const message = currentMessages[messageId];
      if (message.entries.length < 2) {
        continue;
      }

      const lastEntryTime = message.entries[message.entries.length - 1].relTime;
      const entrySpan = (lastEntryTime || 0) - (message.entries[0].relTime || 0);
      if (entrySpan > STREAMING_WINDOW) {
        const newEntryFloor = firstEntryIndexInsideStreamingWindow(message.entries);
        message.entries = message.entries.slice(newEntryFloor);
        currentMessages[messageId] = message;
      }
    }

    return currentMessages;
  }, []);

  const addAndRehydrateMessages = useCallback(
    (prevMessages: Messages, newMessages: Messages, options: any = {}) => {
      const currentMessages = { ...prevMessages };

      Object.keys(newMessages).forEach((key) => {
        // add message
        if (options.replace !== true && key in prevMessages) {
          // should merge here instead of concat
          // assumes messages are always sequential
          const msgEntries = currentMessages[key].entries;
          const newMsgEntries = newMessages[key].entries;
          const msgLength = msgEntries.length;
          const newMsgLength = newMsgEntries.length;
          const entryLength = msgLength + newMsgLength;
          currentMessages[key] = {
            ...currentMessages[key],
            entries: Array(entryLength),
          };

          let msgIndex = 0;
          let newMsgIndex = 0;

          for (let i = 0; i < entryLength; ++i) {
            if (newMsgIndex >= newMsgLength) {
              currentMessages[key].entries[i] = msgEntries[msgIndex++];
            } else if (msgIndex >= msgLength) {
              currentMessages[key].entries[i] = newMsgEntries[newMsgIndex++];
            } else if (msgEntries[msgIndex].relTime <= newMsgEntries[newMsgIndex].relTime) {
              currentMessages[key].entries[i] = msgEntries[msgIndex++];
            } else if (msgEntries[msgIndex].relTime >= newMsgEntries[newMsgIndex].relTime) {
              currentMessages[key].entries[i] = newMsgEntries[newMsgIndex++];
            }
          }
          currentMessages[key].byteStateChangeCounts = newMessages[key].byteStateChangeCounts;
        } else {
          currentMessages[key] = newMessages[key];
          currentMessages[key].frame = dbc.getMessageFrame(currentMessages[key].address);
        }
      });

      const newCount = DBCUtils.findMaxByteStateChangeCount(currentMessages);
      setMaxByteStateChangeCount(newCount);

      Object.keys(currentMessages).forEach((key) => {
        currentMessages[key] = DBCUtils.setMessageByteColors(currentMessages[key], newCount);
      });

      return currentMessages;
    },
    [dbc],
  );

  useEffect(() => {
    if (canStreamer.current) {
      canStreamer.current.onmessage = onStreamedCanMessagesProcessed;
    }
  }, [onStreamedCanMessagesProcessed, enforceStreamingMessageWindow, addAndRehydrateMessages]);

  const parseMessageEntry = useCallback(
    (_message: Message, lastMsg: MessageEntry | null = null) => {
      const msg = _message;
      dbc.lastUpdated = dbc.lastUpdated || Date.now();
      msg.lastUpdated = dbc.lastUpdated;
      msg.frame = dbc.getMessageFrame(msg.address);

      let prevMsgEntry = lastMsg;
      const internalByteStateChangeCounts: number[][] = [];
      // entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
      //   (count, idx) => entry.messages[id].byteStateChangeCounts[idx] + count
      // );
      msg.entries = msg.entries.map((entry) => {
        // TODO: this will never be evaluated now that hexData is requried
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
        internalByteStateChangeCounts.push(internalEntry.byteStateChangeCounts);
        prevMsgEntry = internalEntry.msgEntry;
        return internalEntry.msgEntry;
      });

      msg.byteStateChangeCounts = internalByteStateChangeCounts.reduce((memo, val) => {
        if (!memo || memo.length === 0) {
          return val;
        }
        return memo.map((count, idx) => val[idx] + count);
      }, []);

      return msg;
    },
    [dbc],
  );

  const firstEntryIndexInsideStreamingWindow = (entries: MessageEntry[]) => {
    const lastEntryTime = entries[entries.length - 1].relTime;
    const windowFloor = lastEntryTime - STREAMING_WINDOW;

    for (let i = 0; i < entries.length; i++) {
      if (entries[i].relTime > windowFloor) {
        return i;
      }
    }

    return 0;
  };

  const getParseSegmentInternal = useCallback(
    async (part: number): Promise<DataCache | undefined> => {
      const start = performance.now();
      if (dbc.lastUpdated === undefined) {
        dbc.lastUpdated = Date.now();
      }

      let reparsedMessages: Messages = {};
      let currentMessages = dataCache[part].messages;
      const { lastUpdated } = dbc;

      Object.keys(currentMessages).forEach((key) => {
        if (currentMessages[key].lastUpdated >= lastUpdated) {
          return;
        }
        reparsedMessages[key] = currentMessages[key];
      });

      if (Object.keys(reparsedMessages).length) {
        console.log('Reparsing messages!', Object.keys(reparsedMessages).length);
        reparsedMessages = await reparseMessages(reparsedMessages);
      }

      currentMessages = {
        ...currentMessages,
        ...reparsedMessages,
      };

      dataCache[part].messages = currentMessages;

      const end = performance.now();
      if (end - start > 200) {
        // warn about anything over 200ms
        console.warn(
          'getParseSegment took',
          part,
          end - start,
          Object.keys(currentMessages).length,
        );
      }

      return dataCache[part];
    },
    [dbc],
  );

  const getParseSegment = useCallback(
    async (part: number) => {
      if (!dataCache[part]) {
        return null;
      }
      if (dataCache[part].promise) {
        await dataCache[part].promise;
      }
      dataCache[part].promise = getParseSegmentInternal(part);

      return dataCache[part].promise;
    },
    [getParseSegmentInternal],
  );

  // const decacheMessageId = (messageId: string) => {
  //   Object.keys(dataCache).forEach((part) => {
  //     const partNumber = parseInt(part, 10);
  //     if (dataCache[partNumber].messages[messageId]) {
  //       dataCache[partNumber].messages[messageId].lastUpdated = 0;
  //     }
  //   });
  // };

  const reparseMessages = useCallback(
    async (reparsedMessages: Messages): Promise<Messages> => {
      dbc.lastUpdated = dbc.lastUpdated || Date.now();

      Object.keys(reparsedMessages).forEach((key) => {
        reparsedMessages[key].frame = dbc.getMessageFrame(reparsedMessages[key].address);
      });

      return new Promise((resolve) => {
        const worker = new MessageParser();
        worker.onmessage = (e: MessageEvent<MessageParserWorkerOutput>) => {
          const newMessages = e.data.messages;
          Object.keys(newMessages).forEach((key) => {
            newMessages[key].lastUpdated = dbc.lastUpdated!;
            newMessages[key].frame = dbc.getMessageFrame(newMessages[key].address);
          });
          resolve(newMessages);
        };

        worker.postMessage({
          messages,
          dbcText: dbc.text(),
          canStartTime: firstCanTime,
        });
      });
    },
    [dbc],
  );

  const showEditMessageModal = useCallback(
    (msgKey: string) => {
      const msg = messages[msgKey];
      console.log(msg);
      if (!msg.frame) {
        msg.frame = dbc.createFrame(msg.address); // TODO frameSize
      }

      setShowingEditMessageModal(true);
      setEditMessageModalMessage(msgKey);
    },
    [messages, dbc],
  );

  const hideEditMessageModal = useCallback(() => {
    setShowingEditMessageModal(false);
  }, []);

  const onMessageSelected = useCallback(
    (msgKey: string) => {
      const msg = messages[msgKey];

      let newSeekIndex = seekIndex;

      if (seekTime > 0 && msg.entries.length > 0) {
        newSeekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
        if (seekIndex === -1) {
          newSeekIndex = 0;
        }

        setSeekTime(msg.entries[seekIndex].relTime);
      }

      setSeekIndex(newSeekIndex);
      setSelectedMessage(msgKey);
    },
    [seekTime, seekIndex, messages],
  );

  const onMessageUnselected = useCallback(() => {
    setSelectedMessage(null);
  }, [setSelectedMessage]);

  const downloadLogAsCSV = () => {
    // TODO: implement
    console.log('Downloading log as CSV');
  };

  return {
    borderColor,
    currentParts,
    dbcFilename,
    dbcLastSaved,
    dongleId,
    isDemo,
    isLive,
    messages,
    name,
    seekIndex,
    seekTime,
    selectedMessages,
    shareUrl,
    showingLoadDbc,
    showingSaveDbc,
    route,
    downloadLogAsCSV,
    handlePandaConnect,
    hideEditMessageModal,
    onMessageSelected,
    onMessageUnselected,
    setSelectedMessages,
    showEditMessageModal,
  };
}
