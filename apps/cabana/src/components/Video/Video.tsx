import { Box } from '@chakra-ui/react';
import { Props } from './props';
import useVideo from './useVideo';
import Sync from './Sync';

export default function Container(props: Props) {
  const state = useVideo(props);
  return <Video {...state} />;
}

function Video(props: ReturnType<typeof useVideo>) {
  const {
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
      <Sync
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
