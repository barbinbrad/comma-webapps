import React, { Ref, RefObject, forwardRef, useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import styled from '@emotion/styled';
import debounce from '~/utils/debounce';

const styles = {
  hidden: { display: 'none' },
  compressed: { width: 0 },
  marker: {
    width: 50,
  },
  tooltip: {
    width: 50,
  },
};

const RouteSeeker = forwardRef(
  (
    {
      nearestFrameTime,
      playing,
      segment,
      segmentIndices,
      startTime,
      videoLength,
      onPause,
      onPlay,
      onPlaySeek,
      onUserSeek,
      ratioTime,
      segmentProgress,
    }: Props,
    ref: Ref<HTMLVideoElement>,
  ) => {
    const videoRef = ref as RefObject<HTMLVideoElement>; // to make typescript happy
    const playTimer = useRef<number>();
    const progressBarRef = useRef<HTMLDivElement>(null);

    const [seekedBarStyle, setSeekedBarStyle] = useState<object>(styles.compressed);
    const [markerStyle, setMarkerStyle] = useState<object>(styles.hidden);
    const [tooltipStyle, setTooltipStyle] = useState<object>(styles.hidden);

    const [ratio, setRatio] = useState(0);
    const [tooltipTime, setTooltipTime] = useState('0:00');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // const previous = usePrevious({ videoLength });

    useEffect(() => {
      setSeekedBarStyle(styles.compressed);
      setMarkerStyle(styles.hidden);
      setTooltipStyle(styles.hidden);
    }, [segmentIndices]);

    // useEffect(() => {
    //   console.log(videoLength);
    //   if (previous && previous.videoLength) {
    //     const secondsSeeked = ratio * previous.videoLength;
    //     const newRatio = secondsSeeked / videoLength;
    //     updateSeekedBar(newRatio);
    //   }
    // }, [videoLength]);

    useEffect(() => {
      if (segment.length || videoRef.current) {
        const newRatio = segmentProgress(nearestFrameTime);
        updateSeekedBar(newRatio);
      }
    }, [nearestFrameTime]);

    useEffect(() => {
      if (playing && !isPlaying) {
        internalOnPlay();
      } else if (!playing && isPlaying) {
        internalOnPause();
      }
    }, [playing]);

    useEffect(() => {
      return () => {
        if (playTimer.current) {
          window.cancelAnimationFrame(playTimer.current);
        }
      };
    }, []);

    const executePlayTimer = useCallback(() => {
      if (videoRef.current === null || videoLength === 0) {
        playTimer.current = window.requestAnimationFrame(executePlayTimer);
        return;
      }

      const roundedStartTime = roundTime(startTime);
      const roundedVideoLength = roundTime(videoLength);
      let roundedCurrentTime = roundTime(videoRef.current.currentTime);

      let newRatio = (roundedCurrentTime - roundedStartTime) / roundedVideoLength;
      if (newRatio === ratio) {
        playTimer.current = window.requestAnimationFrame(executePlayTimer);
        return;
      }

      if ((newRatio >= 1 && segment && segment.length) || newRatio < 0) {
        newRatio = 0;
        roundedCurrentTime = roundedStartTime;
        onUserSeek(newRatio);
      } else if (newRatio >= 1) {
        videoRef.current.pause();
        internalOnPause();
      }

      if (newRatio >= 0) {
        updateSeekedBar(newRatio);
        onPlaySeek(roundedCurrentTime);
      }

      playTimer.current = window.requestAnimationFrame(executePlayTimer);
    }, [videoLength, segment, startTime, ratio]);

    const updateSeekedBar = useCallback((newRatio: number) => {
      setSeekedBarStyle({ width: `${100 * newRatio}%` });
    }, []);

    const internalOnPlay = useCallback(() => {
      playTimer.current = window.requestAnimationFrame(executePlayTimer);

      setIsPlaying(true);
      setRatio((prevRatio) => {
        return prevRatio >= 1 ? 0 : prevRatio;
      });
      onPlay();
    }, []);

    const internalOnPause = useCallback(() => {
      if (playTimer.current) {
        window.cancelAnimationFrame(playTimer.current);
      }

      setIsPlaying(false);
      onPause();
    }, []);

    const updateDraggingSeek = debounce((newRatio: number) => onUserSeek(newRatio), 250);

    const mouseEventXOffsetPercent = (e: React.MouseEvent<HTMLDivElement>) => {
      if (progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        return 100 * (x / progressBarRef.current.offsetWidth);
      }
      return 0;
    };

    const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
      let newRatio = mouseEventXOffsetPercent(e) / 100;
      newRatio = Math.min(1, Math.max(0, ratio));
      updateSeekedBar(newRatio);
      onUserSeek(newRatio);
    };

    const onMouseDown = () => {
      setIsDragging(true);
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    const onMouseLeave = () => {
      setMarkerStyle(styles.hidden);
      setTooltipStyle(styles.hidden);
      setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const markerOffsetPct = mouseEventXOffsetPercent(e);
      if (markerOffsetPct < 0) {
        onMouseLeave();
        return;
      }

      const markerLeft = `calc(${markerOffsetPct}% - ${styles.marker.width / 2}px)`;
      const newMarkerStyle = {
        display: '',
        left: markerLeft,
      };

      const tooltipLeft = `calc(${markerOffsetPct}% - ${styles.tooltip.width / 2}px)`;
      const newTooltipStyle = { display: 'flex', left: tooltipLeft };

      const newRatio = Math.max(0, markerOffsetPct / 100);
      if (isDragging) {
        updateSeekedBar(newRatio);
        updateDraggingSeek(newRatio);
      }

      setMarkerStyle(newMarkerStyle);
      setTooltipStyle(newTooltipStyle);
      setTooltipTime(ratioTime(newRatio).toFixed(3));
    };

    return (
      <Box position="relative">
        <VideoControls>
          {/* <PlayButton
          className="cabana-explorer-visuals-camera-seeker-playbutton"
          onPlay={this.onPlay}
          onPause={this.onPause}
          isPlaying={this.state.isPlaying}
        /> */}
          <ProgressBar
            className="cabana-explorer-visuals-camera-seeker-progress"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onClick={onClick}
            ref={progressBarRef}
          >
            <Tooltip style={tooltipStyle}>{tooltipTime}</Tooltip>
            <Marker style={markerStyle} />
            <SeekedBar style={seekedBarStyle} />
          </ProgressBar>
        </VideoControls>
      </Box>
    );
  },
);

type Props = {
  nearestFrameTime: number;
  playing: boolean;
  segment: number[];
  segmentIndices: number[];
  startTime: number;
  videoLength: number;
  onPause: () => void;
  onPlay: () => void;
  onPlaySeek: (offset: number) => void;
  onUserSeek: (ratio: number) => void;
  ratioTime: (ratio: number) => number;
  segmentProgress: (time: number) => number;
};

function roundTime(time: number) {
  return Math.round(time * 1000) / 1000;
}

const VideoControls = styled.div`
  background: rgba(233, 233, 233, 0.7);
  top: -35px;
  position: absolute;
  width: 100%;
  z-index: 4;
  flex: 1;
  flex-direction: row;
  display: flex;
  background: linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5));
  user-select: none;
  cursor: pointer;
`;

const ProgressBar = styled.div`
  height: 15px;
  width: 100%;
  margin-top: 10px;
  margin-bottom: 10px;
  position: relative;
  display: flex;
  flex: 10;
  z-index: 1;
`;

const Tooltip = styled.div`
  position: absolute;
  z-index: 2;
  top: -25px;
  height: 20px;
  width: 50px;
  border-radius: 1px;
  font-size: 12px;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.9);
  color: rgb(225, 225, 225);
`;

const Marker = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  top: -15%;
  z-index: 3;
`;

const SeekedBar = styled.div`
  position: absolute;
  height: 14px;
  left: 0;
  top: 0;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 2;
`;

export default RouteSeeker;
