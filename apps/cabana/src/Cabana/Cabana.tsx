import { Flex, HStack, VStack } from '@chakra-ui/react';
import moment from 'moment';
import useCabana from './useCabana';
import { Props } from './types';
import Explorer from '~/components/Explorer';
import MessageList from '~/components/MessageList';
import Navigation from '~/components/Navigation';
import debounce from '~/utils/debounce';

export default function Container(props: Props) {
  const state = useCabana(props);
  return <Cabana {...state} />;
}

function Cabana(props: ReturnType<typeof useCabana>) {
  const {
    autoplay,
    borderColor,
    canFrameOffset,
    currentPart,
    currentParts,
    dbcFilename,
    dbcLastSaved,
    firstCanTime,
    firstFrameTime,
    isDemo,
    isLive,
    messages,
    partsLoaded,
    route,
    routeInitTime,
    seekIndex,
    seekTime,
    segments,
    selectedMessage,
    selectedMessages,
    shareUrl,
    showingLoadDbc,
    showingSaveDbc,
    startTime,
    thumbnails,
    downloadLogAsCSV,
    onConfirmedSignalChange,
    onMessageSelected,
    onMessageUnselected,
    onPartChange,
    onSeek,
    onUserSeek,
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
            maxWidth={530}
            borderRightColor={borderColor}
            borderRightWidth={1}
            overflow="scroll"
          >
            <MessageList
              borderColor={borderColor}
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
          {route || isLive ? (
            <Flex as="main" h="full" w="full" overflow="scroll">
              <Explorer
                autoplay={autoplay}
                borderColor={borderColor}
                canFrameOffset={canFrameOffset}
                currentParts={currentParts}
                firstCanTime={firstCanTime}
                isLive={isLive}
                maxqcamera={route ? route.maxqcamera : 0}
                messages={messages}
                partsCount={route ? route.proclog : 0}
                partsLoaded={partsLoaded}
                routeStartTime={route ? route.start_time : moment()}
                seekTime={seekTime}
                seekIndex={seekIndex}
                selectedMessage={selectedMessage}
                selectedPart={currentPart}
                startTime={startTime}
                startSegments={segments}
                thumbnails={thumbnails}
                url={route ? route.url : null}
                videoOffset={firstFrameTime && routeInitTime ? firstFrameTime - routeInitTime : 0}
                onConfirmedSignalChange={onConfirmedSignalChange}
                onSeek={onSeek}
                onUserSeek={onUserSeek}
                onPartChange={onPartChange}
                showEditMessageModal={showEditMessageModal}
              />
            </Flex>
          ) : null}

          {/* <AspectRatio w="full" maxHeight="full" ratio={4 / 3}>
              <Image src={snapshot} />
            </AspectRatio> */}
        </HStack>
      </Flex>
    </VStack>
  );
}
