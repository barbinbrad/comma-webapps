import { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { video as VideoApi } from 'api';
import { Message, Thumbnail } from '~/types';

export default function RouteVideoSync(props: Props) {
  const {
    message,
    segment,
    maxqcamera,
    startTime,
    seekIndex,
    userSeekIndex,
    playing,
    url,
    firstCanTime,
    videoOffset,
    onVideoClick,
    // onPlaySeek, // name is modified
    // onUserSeek, // name is modified
    onPlay,
    onPause,
    // userSeekTime, // name is modified
    playSpeed,
    thumbnails,
  } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoApi = VideoApi(url);
    videoApi
      .getQcameraStreamIndex()
      .then(() => {
        setSource(`${videoApi.getQcameraStreamIndexUrl()}?s=${maxqcamera}`);
      })
      .catch((err: Error) => {
        console.error(err);
      });
  }, []);

  const onUserSeek = useCallback(
    (ratio: number) => {
      /* ratio in [0,1] */
      const seekTime = ratioTime(ratio);
      const funcSeekToRatio = () => props.onUserSeek(seekTime);

      if (Number.isNaN(videoRef.current?.duration)) {
        return;
      }
      videoRef.current!.currentTime = seekTime - videoOffset;

      if (ratio !== 0) {
        funcSeekToRatio();
      }
    },
    [props.onUserSeek],
  );

  const onLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const onLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <Box>
      {isLoading ? loadingOverlay() : null}
      {source && (
        <HLS
          source={source}
          startTime={(startTime || 0) - videoOffset}
          videoLength={this.videoLength()}
          playbackSpeed={playSpeed}
          onVideoElementAvailable={this.onVideoElementAvailable}
          playing={playing}
          onClick={onVideoClick}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onUserSeek={onUserSeek}
          onPlaySeek={this.onPlaySeek}
        />
      )}
      <RouteSeeker
        nearestFrameTime={userSeekTime}
        segmentProgress={this.segmentProgress}
        startTime={startTime() - videoOffset}
        videoLength={this.videoLength()}
        segmentIndices={segmentIndices}
        onUserSeek={onUserSeek}
        onPlaySeek={this.onPlaySeek}
        videoElement={videoRef}
        onPlay={onPlay}
        onPause={onPause}
        playing={playing}
        ratioTime={this.ratioTime}
        segment={segment}
      />
    </Box>
  );
}

type Props = {
  message: Message;
  segment: number[];
  maxqcamera: number;
  startTime: number;
  seekIndex: number;
  userSeekIndex: number;
  playing: boolean;
  url?: string;
  firstCanTime?: number;
  videoOffset?: number;
  onVideoClick: () => void;
  onPlaySeek: (time: number) => void;
  onUserSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  // userSeekTime: (time: number) => void;
  playSpeed: number;
  thumbnails: Thumbnail[];
};
