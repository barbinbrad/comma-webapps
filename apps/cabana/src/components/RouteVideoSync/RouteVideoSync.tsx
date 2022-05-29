import { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import styled from '@emotion/styled';
import { video as VideoApi } from 'api';
import Loading from '~/components/Loading';
import HLS from '~/components/HLS';

export default function RouteVideoSync(props: Props) {
  const {
    borderColor,
    maxqcamera,
    playing,
    segment,
    startTime,
    userSeekTime,
    segmentIndices,
    url,
    videoOffset,
    onVideoClick,
    onPlaySeek,
    onUserSeek,
    onPlay,
    onPause,
    playSpeed,
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = userSeekTime - videoOffset;
    }
  }, [userSeekTime]);

  const handleUserSeek = useCallback(
    (ratio: number) => {
      /* ratio in [0,1] */
      const seekTime = ratioTime(ratio);
      // eslint-disable-next-line react/destructuring-assignment
      const funcSeekToRatio = () => onUserSeek(seekTime);

      if (Number.isNaN(videoRef.current?.duration)) {
        return;
      }
      videoRef.current!.currentTime = seekTime - videoOffset;

      if (ratio !== 0) {
        funcSeekToRatio();
      }
    },
    [onUserSeek],
  );

  const handlePlaySeek = useCallback((offset: number) => {
    const newSeekTime = offset + videoOffset;
    onPlaySeek(newSeekTime);
  }, []);

  const getVideoLength = useCallback(() => {
    if (segment.length) {
      return segment[1] - segment[0];
    }

    if (videoRef.current) {
      return videoRef.current.duration;
    }

    return 0;
  }, []);

  const getStartTime = useCallback(() => {
    if (segment.length) {
      return segment[0];
    }

    return 0;
  }, []);

  const segmentProgress = useCallback((currentTime: number) => {
    // returns progress as number in [0,1]
    const start = getStartTime();

    const ratio = Math.max(currentTime - start, 0) / getVideoLength();
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const ratioTime = useCallback(
    (ratio: number) => {
      return ratio * getVideoLength() + getStartTime();
    },
    [getVideoLength, getStartTime],
  );

  const onLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const onLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const loadingOverlay = () => {
    return <LoadingOverlay emptyColor={borderColor} />;
  };

  return (
    <Box position="relative" w="full" h="full">
      {isLoading ? loadingOverlay() : null}
      {
        source && (
          <HLS
            ref={videoRef}
            source={source}
            startTime={(startTime || 0) - videoOffset}
            playbackSpeed={playSpeed}
            playing={playing}
            onClick={onVideoClick}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onPlaySeek={handlePlaySeek}
          />
        )

        // <RouteSeeker
        //   nearestFrameTime={userSeekTime}
        //   segmentProgress={segmentProgress}
        //   startTime={getStartTime() - videoOffset}
        //   videoLength={getVideoLength()}
        //   segmentIndices={segmentIndices}
        //   onUserSeek={handleUserSeek}
        //   onPlaySeek={handlePlaySeek}
        //   videoElement={videoRef}
        //   onPlay={onPlay}
        //   onPause={onPause}
        //   playing={playing}
        //   ratioTime={ratioTime}
        //   segment={segment}
        // />
      }
    </Box>
  );
}

type Props = {
  borderColor: string;
  maxqcamera: number;
  segment: number[];
  segmentIndices: number[];
  startTime: number;
  playing: boolean;
  playSpeed: number;
  url: string | null;
  userSeekTime: number;
  videoOffset: number;
  onPause: () => void;
  onPlay: () => void;
  onPlaySeek: (time: number) => void;
  onUserSeek: (time: number) => void;
  onVideoClick: () => void;
};

const LoadingOverlay = styled(Loading)`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
`;
