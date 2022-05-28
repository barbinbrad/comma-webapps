import { useState, useCallback, useEffect } from 'react';
import { Box, Center, Input, Spinner, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import { ckmeans } from 'simple-statistics';
import MessageBytes from '~/components/MessageBytes';
import { Message, Messages, Route } from '~/types';

export default function Meta({
  borderColor,
  isLive,
  messages,
  seekIndex,
  seekTime,
  onMessageSelected,
}: Props) {
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

  const renderMessageTableRow = (msg: Message) => {
    return (
      <Tr
        key={msg.id}
        onClick={() => onMessageSelected(msg.id)}
        cursor="pointer"
        _hover={{ background: borderColor }}
      >
        <Td {...styles.first}>{msg.id}</Td>
        <Td {...styles.second}> {msg.frame ? msg.frame.name : ''}</Td>
        <Td {...styles.numeric}>{msg.entries.length}</Td>
        <Td {...styles.generic}>
          <MessageBytes
            key={msg.id}
            message={msg}
            seekIndex={seekIndex}
            seekTime={seekTime}
            isLive={isLive}
          />
        </Td>
      </Tr>
    );
  };

  if (Object.keys(messages).length === 0) {
    return (
      <Center h="full">
        <Spinner thickness="4px" speed="1s" emptyColor={borderColor} color="brand.500" size="xl" />
      </Center>
    );
  }

  return (
    <>
      <Box>
        <Input
          size="sm"
          border="none"
          placeholder="Search"
          value={searchFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchFilter(e.target.value)}
        />
      </Box>
      {/* <TableContainer> */}
      <Table variant="simple" size="sm" borderColor={borderColor} borderTopWidth={1}>
        <Thead>
          <Tr>
            <Th {...styles.first}>ID</Th>
            <Th {...styles.second}>Name</Th>
            <Th {...styles.numeric}>Count</Th>
            <Th {...styles.generic}>Bytes</Th>
          </Tr>
        </Thead>
        <Tbody>{orderedMessages.map(renderMessageTableRow)}</Tbody>
      </Table>
      {/* </TableContainer> */}
    </>
  );
}

export type Props = {
  borderColor: string;
  messages: Messages;
  selectedMessages: string[];
  setSelectedMessages: (messages: string[]) => void;
  showEditMessageModal: (message: string) => void;
  currentParts: [number, number];
  onMessageSelected: (key: string) => void;
  onMessageUnselected: () => void;
  showingLoadDbc: boolean;
  showingSaveDbc: boolean;
  dbcFilename: string;
  dbcLastSaved: any;
  route: Route | null;
  seekTime: number;
  seekIndex: number;
  shareUrl: string | null;
  isDemo: boolean;
  isLive: boolean;
  saveLog: (args: any) => void;
};
