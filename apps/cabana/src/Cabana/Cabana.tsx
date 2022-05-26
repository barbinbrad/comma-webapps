import {
  AspectRatio,
  Button,
  Center,
  Input,
  Image,
  Flex,
  HStack,
  VStack,
  Spinner,
} from '@chakra-ui/react';
import { FaRegEdit } from 'react-icons/fa';
import useCabana from './useCabana';
import Meta from '../components/Meta';
import Navigation from '../components/Navigation';
import snapshot from '../data/snapshot.jpg';
import { Props } from './types';
import debounce from '../utils/debounce';

export default function Container(props: Props) {
  const state = useCabana(props);
  return <Cabana {...state} />;
}

function Cabana(props: ReturnType<typeof useCabana>) {
  const {
    borderColor,
    currentParts,
    dbcFilename,
    dbcLastSaved,
    dongleId,
    isDemo,
    isLive,
    messages,
    name,
    route,
    seekIndex,
    seekTime,
    selectedMessages,
    shareUrl,
    showingLoadDbc,
    showingSaveDbc,
    downloadLogAsCSV,
    onMessageSelected,
    onMessageUnselected,
    setSelectedMessages,
    showEditMessageModal,
  } = props;

  return (
    <VStack h="100vh" w="100vw" spacing={0}>
      <Flex as="nav" w="full">
        <Navigation />
      </Flex>
      <Flex h="full">
        <HStack w="100vw" spacing={0}>
          <Flex
            as="aside"
            direction="column"
            h="full"
            w="full"
            maxWidth={520}
            borderRightColor={borderColor}
            borderRightWidth={1}
            overflow="scroll"
          >
            <Meta
              borderColor={borderColor}
              url={route ? route.url : null}
              messages={messages}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              showEditMessageModal={showEditMessageModal}
              currentParts={currentParts}
              onMessageSelected={onMessageSelected}
              onMessageUnselected={onMessageUnselected}
              showingLoadDbc={showingLoadDbc}
              showingSaveDbc={showingSaveDbc}
              dbcFilename={dbcFilename}
              dbcLastSaved={dbcLastSaved}
              dongleId={dongleId}
              name={name}
              route={route}
              seekTime={seekTime}
              seekIndex={seekIndex}
              shareUrl={shareUrl}
              isDemo={isDemo}
              isLive={isLive}
              saveLog={debounce(downloadLogAsCSV, 500)}
            />
          </Flex>
          {/* <Flex
            as="main"
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
          <Flex as="aside" h="full" w="full" overflow="scroll">
            <AspectRatio w="full" maxHeight="full" ratio={4 / 3}>
              <Image src={snapshot} />
            </AspectRatio>
          </Flex>
        </HStack>
      </Flex>
    </VStack>
  );
}
