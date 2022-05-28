import { useState, useCallback } from 'react';
import { useEscape } from 'hooks';
import Entries from '~/models/can/entries';
import { Props } from './props';
import { Message, PlottedSignals } from '~/types';
import debounce from '~/utils/debounce';

export default function useExplorer(props: Props) {
  const {
    autoplay,
    canFrameOffset,
    currentParts,
    firstCanTime,
    isLive,
    maxqcamera,
    messages,
    partsCount,
    partsLoaded,
    routeStartTime,
    url,
    seekTime,
    seekIndex,
    selectedMessage,
    selectedPart,
    startSegments,
    startTime,
    thumbnails,
    videoOffset,
    onConfirmedSignalChange,
    onSeek,
    onUserSeek,
    onPartChange,
    showEditMessageModal,
  } = props;

  const [playing, setPlaying] = useState(autoplay);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [plottedSignals, setPlottedSignals] = useState<PlottedSignals[][]>([]);
  const [segment, setSegment] = useState(startSegments || []);
  const [segmentIndices, setSegmentIndicies] = useState<number[]>([]);
  const [showingAddSignal, setShowingAddSignal] = useState(true);
  const [userSeekIndex, setUserSeekIndex] = useState(0);
  const [userSeekTime, setUserSeekTime] = useState(0);

  const escapeHandler = useCallback(() => resetSegment(), []);
  useEscape(escapeHandler);

  const updatePlaySpeed = useCallback((speed: number) => {
    setPlaySpeed(speed);
  }, []);

  const onPause = useCallback(() => {
    setPlaying(false);
  }, []);

  const onPlay = useCallback(() => {
    setPlaying(true);
  }, []);

  const onVideoClick = useCallback(() => {
    setPlaying((prevPlaying) => !prevPlaying);
  }, []);

  const onPlaySeek = (time: number) => {
    const message = messages[selectedMessage || ''];
    if (!message || message.entries.length === 0) {
      onSeek(0, time);
      return;
    }

    const newSeekIndex = indexFromSeekTime(time);
    const newSeekTime = time;
    if (newSeekIndex && newSeekTime) {
      onSeek(newSeekIndex, newSeekTime);
    }
  };

  const indexFromSeekTime = (time: number) => {
    // returns index guaranteed to be in [0, entries.length - 1]

    const { entries } = messages[selectedMessage || ''];
    if (entries.length === 0) return null;

    if (segmentIndices.length === 2 && segmentIndices[0] >= 0) {
      for (
        let i = segmentIndices[0], l = Math.min(entries.length - 1, segmentIndices[1]);
        i <= l;
        i++
      ) {
        if (entries[i].relTime >= time) {
          return i;
        }
      }
      return segmentIndices[1];
    }
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].relTime >= time) {
        return i;
      }
    }
    return entries.length - 1;
  };

  const timeWindow = useCallback(() => {
    if (routeStartTime) {
      const partStartOffset = currentParts[0] * 60;
      const partEndOffset = (currentParts[1] + 1) * 60;

      const windowStartTime = routeStartTime.clone().add(partStartOffset, 's').format('HH:mm:ss');
      const windowEndTime = routeStartTime.clone().add(partEndOffset, 's').format('HH:mm:ss');

      return `${windowStartTime} - ${windowEndTime}`;
    }
    return '';
  }, [routeStartTime, currentParts]);

  const onSignalPlotPressed = useCallback((messageId: string, signalUid: string) => {
    setPlottedSignals((prevPlottedSignals) => [[{ messageId, signalUid }], ...prevPlottedSignals]);
  }, []);

  const onSignalUnplotPressed = useCallback((messageId: string, signalUid: string) => {
    setPlottedSignals((prevPlottedSignals) => {
      return prevPlottedSignals
        .map((plot) =>
          plot.filter(
            (signal) => !(signal.messageId === messageId && signal.signalUid === signalUid),
          ),
        )
        .filter((plot) => plot.length > 0);
    });
  }, []);

  const onSegmentChanged = useCallback(
    (messageId: string) => {
      if (Array.isArray(segment)) {
        updateSegment(messageId, segment);
      }
    },
    [segment],
  );

  const updateSegment = debounce((messageId: string, _segment: number[]) => {
    let newSegment = _segment;
    const { entries } = messages[messageId];
    let newSegmentIndices = Entries.findSegmentIndices(entries, newSegment, true);

    // console.log(this.state.segment, '->', segment, segmentIndices);
    if (newSegment[0] === currentParts[0] * 60 && newSegment[1] === (currentParts[1] + 1) * 60) {
      newSegment = [];
      newSegmentIndices = [];
    }
    let newUserSeekTime = userSeekTime;
    if (newSegment.length) {
      newUserSeekTime = Math.max(newSegment[0], newUserSeekTime);
      newUserSeekTime = Math.min(newSegment[1], newUserSeekTime);
    } else {
      newUserSeekTime = Math.max(currentParts[0] * 60, newUserSeekTime);
      newUserSeekTime = Math.min(currentParts[1] * 60, newUserSeekTime);
    }

    setSegment(newSegment);
    setSegmentIndicies(newSegmentIndices);
    setUserSeekTime(newUserSeekTime);
    setUserSeekIndex(newSegmentIndices[0]);
  }, 250);

  const resetSegment = useCallback(() => {
    if (segment.length > 0 || segmentIndices.length > 0) {
      setSegment([]);
      setSegmentIndicies([]);
      setUserSeekIndex(0);
    }
  }, [segment, segmentIndices]);

  const showAddSignal = useCallback(() => {
    setShowingAddSignal(true);
  }, []);

  const toggleAddSignal = useCallback(() => {
    setShowingAddSignal((prevAddSignal) => !prevAddSignal);
  }, []);

  return {
    firstCanTime,
    maxqcamera,
    messages,
    playing,
    playSpeed,
    seekIndex,
    segment,
    selectedMessage,
    startTime,
    thumbnails,
    userSeekIndex,
    userSeekTime,
    url,
    videoOffset,
    onPause,
    onPlay,
    onPlaySeek,
    onSegmentChanged,
    onSignalPlotPressed,
    onSignalUnplotPressed,
    onUserSeek,
    onVideoClick,
    showAddSignal,
    toggleAddSignal,
    timeWindow,
    updatePlaySpeed,
  };
}

function clipSegment(_segment: number[], _segmentIndices: number[], nextMessage: Message) {
  let segment = _segment;
  let segmentIndices = _segmentIndices;
  if (segment.length === 2) {
    const segmentStartIdx = nextMessage.entries.findIndex((e) => e.relTime >= segment[0]);
    let segmentEndIdx = nextMessage.entries.findIndex((e) => e.relTime >= segment[1]);
    if (segmentStartIdx !== -1) {
      if (segmentEndIdx === -1) {
        // previous segment end is past bounds of this message
        segmentEndIdx = nextMessage.entries.length - 1;
      }
      const segmentStartTime = nextMessage.entries[segmentStartIdx].relTime;
      const segmentEndTime = nextMessage.entries[segmentEndIdx].relTime;

      segment = [segmentStartTime, segmentEndTime];
      segmentIndices = [segmentStartIdx, segmentEndIdx];
    } else {
      // segment times are out of boudns for this message
      segment = [];
      segmentIndices = [];
    }
  }

  return { segment, segmentIndices };
}
