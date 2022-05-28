import { Props } from './props';
import useExplorer from './useExplorer';

export default function Container(props: Props) {
  const state = useExplorer(props);
  return <Explorer {...state} />;
}

function Explorer(props: ReturnType<typeof useExplorer>) {
  const {
    firstCanTime,
    maxqcamera,
    messages,
    playing,
    playSpeed,
    segment,
    selectedMessage,
    seekIndex,
    startTime,
    thumbnails,
    userSeekIndex,
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
    // <RouteVideoSync
    //   message={messages[selectedMessage || '']}
    //   segment={segment}
    //   maxqcamera={maxqcamera}
    //   startTime={startTime}
    //   seekIndex={seekIndex}
    //   userSeekIndex={userSeekIndex}
    //   playing={playing}
    //   url={url}
    //   firstCanTime={firstCanTime}
    //   videoOffset={videoOffset}
    //   onVideoClick={onVideoClick}
    //   onPlaySeek={onPlaySeek}
    //   onUserSeek={onUserSeek}
    //   onPlay={onPlay}
    //   onPause={onPause}
    //   userSeekTime={userSeekTime}
    //   playSpeed={playSpeed}
    //   thumbnails={thumbnails}
    // />
    <h1>Explorer</h1>
  );
}
