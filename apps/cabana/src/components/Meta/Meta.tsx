import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Center,
  Input,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  // TableContainer,
} from '@chakra-ui/react';
import { ckmeans } from 'simple-statistics';
import MessageBytes from '../MessageBytes';
import { Message, Messages, Route } from '../../types';

export default function Meta(props: Props) {
  const [searchFilter, setSearchFilter] = useState('');
  const [orderedMessageKeys, setOrderedMessageKeys] = useState<string[]>([]);

  useEffect(() => {
    setOrderedMessageKeys(sortMessages());
  }, [props.messages]);

  const sortMessages = useCallback(() => {
    if (Object.keys(props.messages).length === 0) return [];
    const messagesByEntryCount = Object.entries(props.messages).reduce(
      (partialMapping: { [key: string]: Message[] }, [msgId, msg]) => {
        const entryCountKey = msg.entries.length.toString(); // js object keys are strings
        if (!partialMapping[entryCountKey]) {
          partialMapping[entryCountKey] = [msg];
        } else {
          partialMapping[entryCountKey].push(msg);
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
          .reduce((messages, partial) => messages.concat(partial), [])
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
  }, [props.messages]);

  const orderedMessages = useCallback(() => {
    return orderedMessageKeys.map((key) => props.messages[key]);
  }, [orderedMessageKeys, props.messages]);

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

  const renderCanMessages = () => {
    return orderedMessages().filter(canMessageFilter).map(renderMessageBytes);
  };

  const renderMessageBytes = (msg: Message) => {
    return (
      <Tr key={msg.id} onClick={() => props.onMessageSelected(msg.id)}>
        <Td borderColor={props.borderColor} fontSize={12}>
          {msg.frame ? msg.frame.name : ''}
        </Td>
        <Td borderColor={props.borderColor} fontSize={12}>
          {msg.id}
        </Td>
        <Td borderColor={props.borderColor} fontSize={12}>
          {msg.entries.length}
        </Td>
        <Td borderColor={props.borderColor}>
          <Box>
            <MessageBytes
              key={msg.id}
              message={msg}
              seekIndex={props.seekIndex}
              seekTime={props.seekTime}
              isLive={props.isLive}
            />
          </Box>
        </Td>
      </Tr>
    );
  };

  if (Object.keys(props.messages).length === 0) {
    return (
      <Center h="full">
        <Spinner
          thickness="4px"
          speed="1s"
          emptyColor={props.borderColor}
          color="brand.500"
          size="xl"
        />
      </Center>
    );
  }

  return (
    <>
      <Box>
        <Input
          size="sm"
          borderRadius={0}
          borderTopWidth={0}
          borderLeftWidth={0}
          borderRightWidth={0}
          borderBottomWidth={1}
          borderColor={props.borderColor}
          placeholder="Search"
        />
      </Box>
      {/* <TableContainer> */}
      <Table variant="simple" size="sm" borderColor={props.borderColor}>
        <Thead>
          <Tr>
            <Th borderColor={props.borderColor}>Name</Th>
            <Th borderColor={props.borderColor}>ID</Th>
            <Th borderColor={props.borderColor} isNumeric>
              Count
            </Th>
            <Th borderColor={props.borderColor}>Bytes</Th>
          </Tr>
        </Thead>
        <Tbody>{renderCanMessages()}</Tbody>
      </Table>
      {/* </TableContainer> */}
    </>
  );
}

export type Props = {
  borderColor: string;
  url?: string | null;
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
  dbcLastSaved: object | null;
  dongleId?: string;
  name?: string;
  route: Route | null;
  seekTime: number;
  seekIndex: number;
  shareUrl: string | null;
  isDemo: boolean;
  isLive: boolean;
  saveLog: (args: any) => void;
};
