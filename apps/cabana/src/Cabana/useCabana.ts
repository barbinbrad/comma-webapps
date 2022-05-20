/* eslint-disable no-param-reassign */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useColorMode } from '@chakra-ui/react';
import PandaAPI from 'panda';
import Panda from 'panda/dist/module/lib/panda';
import { STREAMING_WINDOW } from '../config';
import useInterval from '../hooks/useInterval';
import DBC from '../services/dbc';
import utils from '../services/dbc/utils';
import storage from '../services/localStorage/localStorage';
import { Props } from './types';
import { MessageEntry, Messages, StreamingData } from '../types';

type DataCache = {
  lastUsed: number;
};

const dataCache: { [key: number]: DataCache } = {};

export default function useCabana(props: Props) {
  const { colorMode } = useColorMode();
  const borderColor = colorMode !== 'dark' ? 'gray.200' : 'whiteAlpha.300';

  const [messages, setMessages] = useState<Messages>({});
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [route, setRoute] = useState(null);
  const [canFrameOffset, setCanFrameOffset] = useState(0);
  const [routeInitTime, setRouteInitTime] = useState(0);
  const [firstFrameTime, setFirstFrameTime] = useState(0);
  const [firstCanTime, setFirstCanTime] = useState<number | null>(null);
  const [lastBusTime, setLastBusTime] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [currentParts, setCurrentParts] = useState([0, 0]);
  const [currentPart, setCurrentPart] = useState(0);
  const [currentWorkers, setCurrentWorkers] = useState({});
  const [loadingParts, setLoadingParts] = useState([]);
  const [loadedParts, setLoadedParts] = useState([]);
  const [loadMessagesFromCacheRunning, setLoadMessagesFromCacheRunning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoadDbc, setShowLoadDbc] = useState(false);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editMessageModalMessage, setEditMessageModalMessage] = useState(null);
  const [dbc, setDbc] = useState(props.dbc ? props.dbc : new DBC());
  const [dbcText, setDbcText] = useState(props.dbc ? props.dbc.text() : new DBC().text());
  const [dbcFilename, setDbcFilename] = useState(props.dbcFilename ? props.dbcFilename : 'New_DBC');
  const [dbcLastSaved, setDbcLastSaved] = useState(null);
  const [seekTime, setSeekTime] = useState(props.startTime || 0);
  const [seekIndex, setSeekIndex] = useState(0);
  const [maxByteStateChangeCount, setMaxByteStateChangeCount] = useState(0);
  const [spawnWorkerHash, setSpawnWorkerHash] = useState(null);
  const [attemptingPandaConnection, setAttemptingPandaConnection] = useState(false);
  const [pandaNoDeviceSelected, setPandaNoDeviceSelected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isGithubAuthenticated, setIsGithubAuthenticated] = useState(
    props.githubAuthToken !== null && props.githubAuthToken !== undefined,
  );
  const [shareUrl, setShareUrl] = useState(false);
  const [logUrls, setLogUrls] = useState(false);

  const [panda, setPanda] = useState<Panda>();
  const openDbcClient = useRef<OpenDbcClient>();
  const unloggerClient = useRef<UnloggerClient>();
  const canStreamerWorker = useRef<Worker>();

  useEffect(() => {
    initializeUnlogger();
    initializePanda();

    async function initializePanda() {
      const webUSB = await PandaAPI({});
      setPanda(webUSB);
    }

    function initializeUnlogger() {
      if (props.unlogger) {
        unloggerClient.current = new UnloggerClient();
      }
    }
  }, []);

  useEffect(() => {
    if (props.githubAuthToken) {
      openDbcClient.current = new OpenDbc(props.githubAuthToken);
    }
  }, [props.githubAuthToken]);

  const processStreamedCanMessages = useCallback(
    (newCanMessages: any) => {
      const prevMsgEntries = Object.entries(messages).reduce(lastMessageEntriesById, {});

      const byteStateChangeCountsByMessage = Object.entries(messages).reduce(
        (obj, [msgId, msg]) => {
          obj[msgId] = msg.byteStateChangeCounts;
          return obj;
        },
        {} as { [key: string]: number[] },
      );

      canStreamerWorker.current?.postMessage({
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

  useEffect(() => {
    if (panda) {
      panda.onMessage(processStreamedCanMessages);
    }
  }, [panda]);

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

  const handlePandaConnect = async () => {
    setAttemptingPandaConnection(true);
    setIsLive(true);

    const persistedDbc = storage.fetchPersistedDBC('live');
    if (persistedDbc) {
      setDbc(persistedDbc.dbc);
      setDbcText(persistedDbc.dbcText);
    }
    canStreamerWorker.current = new CanStreamerWorker();
    if (canStreamerWorker.current) {
      canStreamerWorker.current.onmessage = onStreamedCanMessagesProcessed;
    }

    // // if any errors go off during connection, mark as not trying to connect anymore...
    // const unlisten = panda?.onError((err: Error) => {
    //   console.error(err.stack || err);
    //   setAttemptingPandaConnection(false);
    // });

    try {
      await panda?.start();
      setShowOnboarding(false);
      setShowLoadDbc(true);
    } finally {
      setAttemptingPandaConnection(false);
    }

    // unlisten();
  };

  const onStreamedCanMessagesProcessed = useCallback(
    ({ data }: MessageEvent<StreamingData>) => {
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
      if (data.maxByteStateChangeCount < maxByteStateChangeCount) {
        setMaxByteStateChangeCount(data.maxByteStateChangeCount);
      }
    },
    [maxByteStateChangeCount, seekIndex, selectedMessages],
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
      const entrySpan = lastEntryTime - message.entries[0].relTime;
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
        if ('replace' in options && options.replace !== true && key in messages) {
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
            } else if (currentMessages[msgIndex].relTime <= newMsgEntries[newMsgIndex].relTime) {
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

      setMaxByteStateChangeCount(utils.findMaxByteStateChangeCount(currentMessages));

      Object.keys(currentMessages).forEach((key) => {
        // console.log(key);
        currentMessages[key] = utils.setMessageByteColors(
          currentMessages[key],
          maxByteStateChangeCount,
        );
      });

      return currentMessages;
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

  return {
    borderColor,
    handlePandaConnect,
  };
}
