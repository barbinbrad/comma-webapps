import { Box, Input, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';

import Loading from '~/components/Loading';
import MessageBytes from './MessageBytes';
import { Props } from './props';
import { Message } from '~/types';
import useMessageList from './useMessageList';

export default function Container(props: Props) {
  const state = useMessageList(props);
  return <MessageList {...state} />;
}

function MessageList(props: ReturnType<typeof useMessageList>) {
  const {
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
  } = props;

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
    return <Loading />;
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
    </>
  );
}
