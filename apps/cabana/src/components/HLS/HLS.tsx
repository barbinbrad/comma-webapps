import { Ref, RefObject, forwardRef, useEffect, useState, useCallback } from 'react';
import { AspectRatio } from '@chakra-ui/react';
import Hls from 'hls.js';

const HLS = forwardRef(
  (
    {
      source,
      startTime,
      playbackSpeed,
      playing,
      onClick,
      onLoadStart,
      onLoadEnd,
      onPlaySeek,
    }: Props,
    ref: Ref<HTMLVideoElement>,
  ) => {
    const videoRef = ref as RefObject<HTMLVideoElement>; // to make typescript happy
    const [player, setPlayer] = useState<Hls | null>(null);
    const [shouldInitVideoTime, setShouldInitVideoTime] = useState(true);

    useEffect(() => {
      setPlayer(
        new Hls({
          enableWorker: false,
        }),
      );

      return () => {
        if (player) {
          player.destroy();
          setPlayer(null);
        }
      };
    }, []);

    useEffect(() => {
      if (player) {
        player.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // try to recover network error
                console.error('fatal network error encountered, try to recover');
                player.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('fatal media error encountered, try to recover');
                player.recoverMediaError();
                break;
              default:
                // cannot recover
                player.destroy();
                setPlayer(null);
                break;
            }
          }
        });

        loadSource();
      }
    }, [player]);

    useEffect(() => {
      if (videoRef && videoRef.current) {
        if (playing && (videoRef.current.paused || videoRef.current.currentTime < 0.01)) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    }, [playing]);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
    }, [playbackSpeed]);

    const onSeeking = useCallback(() => {
      if (!playing) {
        if (videoRef.current) {
          onLoadStart();
          onPlaySeek(videoRef.current.currentTime);
        }
      }
    }, []);

    const loadSource = useCallback(() => {
      if (player && videoRef.current) {
        player.loadSource(source);
        player.attachMedia(videoRef.current);
      }
    }, [player, source]);

    const onSeeked = useCallback(() => {
      if (!playing) {
        onLoadEnd();
      }
    }, [playing]);

    const onLoadedData = useCallback(() => {
      if (shouldInitVideoTime && videoRef.current) {
        videoRef.current.currentTime = startTime;
        setShouldInitVideoTime(false);
      }
    }, [shouldInitVideoTime, startTime]);

    return (
      <AspectRatio w="full" maxHeight="full" ratio={4 / 3} onClick={onClick}>
        <video
          ref={videoRef}
          autoPlay={playing}
          muted
          onWaiting={onLoadStart}
          onPlaying={onLoadEnd}
          onSeeking={onSeeking}
          onSeeked={onSeeked}
          onLoadedData={onLoadedData}
        />
      </AspectRatio>
    );
  },
);

export default HLS;

type Props = {
  source: string;
  startTime: number;
  playbackSpeed: number;
  playing: boolean;
  onClick: () => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onPlaySeek: (offset: number) => void;
};
