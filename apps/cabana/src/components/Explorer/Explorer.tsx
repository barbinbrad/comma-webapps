import { Box } from '@chakra-ui/react';
import { Props } from './props';
import useExplorer from './useExplorer';
import RouteVideoSync from '~/components/RouteVideoSync';

export default function Container(props: Props) {
  const state = useExplorer(props);
  return <Explorer {...state} />;
}

function Explorer(props: ReturnType<typeof useExplorer>) {
  const {
    borderColor,
    maxqcamera,
    playing,
    playSpeed,
    segment,
    segmentIndices,
    startTime,
    userSeekTime,
    url,
    videoOffset,
    onPause,
    onPlay,
    onPlaySeek,
    onUserSeek,
    onVideoClick,
  } = props;

  return (
    <Box w="full" h="full">
      <RouteVideoSync
        borderColor={borderColor}
        maxqcamera={maxqcamera || 0}
        playing={playing}
        playSpeed={playSpeed}
        segment={segment}
        segmentIndices={segmentIndices}
        startTime={startTime}
        userSeekTime={userSeekTime}
        url={url || null}
        videoOffset={videoOffset}
        onPause={onPause}
        onPlay={onPlay}
        onPlaySeek={onPlaySeek}
        onUserSeek={onUserSeek}
        onVideoClick={onVideoClick}
      />
    </Box>
  );
}
