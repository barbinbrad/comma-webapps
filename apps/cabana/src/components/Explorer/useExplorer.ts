import { useState, useCallback, useEffect } from 'react';
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

  const [entriesCount, setEntriesCount] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [plottedSignals, setPlottedSignals] = useState<PlottedSignals[][]>([]);
  const [segment, setSegment] = useState(startSegments || []);
  const [segmentIndices, setSegmentIndices] = useState<number[]>([]);
  const [showingAddSignal, setShowingAddSignal] = useState(true);
  const [userSeekIndex, setUserSeekIndex] = useState(0);
  const [userSeekTime, setUserSeekTime] = useState(0);

  const escapeHandler = useCallback(() => resetSegment(), []);
  useEscape(escapeHandler);

  useEffect(() => {
    if (Object.keys(messages).length === 0) {
      resetSegment();
    }
  }, [messages]);

  useEffect(() => {
    const validatedPlottedSignals = plottedSignals
      .map((plot) =>
        plot.filter(({ messageId, signalUid }) => {
          const messageExists = Boolean(messages[messageId]);
          let signalExists = true;
          if (messageExists) {
            signalExists = Object.values(messages[messageId].frame!.signals).some(
              (signal) => signal.uid === signalUid,
            );
          }

          return messageExists && signalExists;
        }),
      )
      .filter((plot) => plot.length > 0);

    if (plottedSignals.length !== validatedPlottedSignals.length) {
      setPlottedSignals(validatedPlottedSignals);
    }
  }, [plottedSignals, messages]);

  useEffect(() => {
    if (selectedMessage) {
      // TODO: do the segement clipping stuff
      clipSegment(selectedMessage, true);
    }
  }, [selectedMessage]);

  useEffect(() => {
    if (selectedMessage) {
      checkForEntryCountChange();
    }
  }, [messages, selectedMessage]);

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

  const checkForEntryCountChange = () => {
    const newEntries = messages[selectedMessage || ''].entries.length || 0;
    if (newEntries !== entriesCount) {
      clipSegment(selectedMessage!);
      setEntriesCount(newEntries);
    }
  };

  const clipSegment = (selectedMessageKey: string, updateSeekTime = false) => {
    const nextMessage = messages[selectedMessageKey];
    let newSegment = [...segment];
    let newSegmentIndices = [...segmentIndices];

    if (newSegment.length === 2) {
      const segmentStartIdx = nextMessage.entries.findIndex((e) => e.relTime >= newSegment[0]);
      let segmentEndIdx = nextMessage.entries.findIndex((e) => e.relTime >= newSegment[1]);
      if (segmentStartIdx !== -1) {
        if (segmentEndIdx === -1) {
          // previous segment end is past bounds of this message
          segmentEndIdx = nextMessage.entries.length - 1;
        }
        const segmentStartTime = nextMessage.entries[segmentStartIdx].relTime;
        const segmentEndTime = nextMessage.entries[segmentEndIdx].relTime;

        newSegment = [segmentStartTime, segmentEndTime];
        newSegmentIndices = [segmentStartIdx, segmentEndIdx];
      } else {
        // segment times are out of boudns for this message
        newSegment = [];
        newSegmentIndices = [];
      }
    }

    setSegment(newSegment);
    setSegmentIndices(newSegmentIndices);
    if (updateSeekTime) setUserSeekIndex(seekIndex);
  };

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
    setSegmentIndices(newSegmentIndices);
    setUserSeekTime(newUserSeekTime);
    setUserSeekIndex(newSegmentIndices[0]);
  }, 250);

  const resetSegment = useCallback(() => {
    if (segment.length > 0 || segmentIndices.length > 0) {
      setSegment([]);
      setSegmentIndices([]);
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
    segmentIndices,
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
