import { useState, useCallback, useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { ckmeans } from 'simple-statistics';
import { Props } from './props';
import { Message } from '~/types';

export default function useMessageList({
  isLive,
  messages,
  seekIndex,
  seekTime,
  onMessageSelected,
}: Props) {
  const { colorMode } = useColorMode();
  const borderColor = colorMode !== 'dark' ? 'gray.200' : 'whiteAlpha.300';

  const [searchFilter, setSearchFilter] = useState('');
  const [orderedMessageKeys, setOrderedMessageKeys] = useState<string[]>([]);
  const [orderedMessages, setOrderedMessages] = useState<Message[]>([]);

  useEffect(() => {
    setOrderedMessageKeys(sortMessages());
  }, [messages]);

  useEffect(() => {
    setOrderedMessages(orderedMessageKeys.map((key) => messages[key]).filter(canMessageFilter));
  }, [orderedMessageKeys, searchFilter]);

  const sortMessages = () => {
    if (Object.keys(messages).length === 0) return [];
    const messagesByEntryCount = Object.entries(messages).reduce(
      (partialMapping: { [key: string]: Message[] }, entry) => {
        const entryCountKey = entry[1].entries.length.toString(); // js object keys are strings
        if (!partialMapping[entryCountKey]) {
          // eslint-disable-next-line no-param-reassign
          partialMapping[entryCountKey] = [entry[1]];
        } else {
          partialMapping[entryCountKey].push(entry[1]);
        }
        return partialMapping;
      },
      {},
    );

    const entryCounts = Object.keys(messagesByEntryCount).map((count) => parseInt(count, 10));
    const binnedEntryCounts = ckmeans(entryCounts, Math.min(entryCounts.length, 10));
    const sortedKeys = binnedEntryCounts
      .map((bin) =>
        bin
          .map((entryCount) => messagesByEntryCount[entryCount.toString()])
          .reduce((msgs, partial) => msgs.concat(partial), [])
          .sort((msg1, msg2) => {
            if (msg1.address < msg2.address) {
              return 1;
            }
            return -1;
          })
          .map((msg) => msg.id),
      )
      .reduce((keys, bin) => keys.concat(bin), [])
      .reverse();

    return sortedKeys;
  };

  const canMessageFilter = useCallback(
    (msg: Message) => {
      const msgName = msg.frame ? msg.frame.name : '';

      return (
        searchFilter === '' ||
        msg.id.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 ||
        msgName.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1
      );
    },
    [searchFilter],
  );

  const styles = {
    first: {
      borderColor,
      fontSize: 12,
      paddingEnd: 0,
    },
    second: {
      borderColor,
      fontSize: 12,
      paddingStart: 0,
      paddingEnd: 0,
    },
    generic: {
      borderColor,
      fontSize: 12,
    },
    numeric: {
      borderColor,
      fontSize: 12,
      isNumeric: true,
    },
  };

  return {
    borderColor,
    isLive,
    messages,
    orderedMessages,
    searchFilter,
    seekIndex,
    seekTime,
    styles,
    onMessageSelected,
    setSearchFilter,
  };
}
