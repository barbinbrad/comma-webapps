import { memo, useState, useCallback, useRef, useEffect } from 'react';
import usePrevious from '../../hooks/usePrevious';
import DbcUtils from '../../models/dbc/utils';
import { Message, MessageEntry } from '../../types';

function MessageBytes(props: Props) {
  const [lastMessageIndex, setLastMessageIndex] = useState(0);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const { message, isLive, seekTime, seekIndex } = props;
  const previous = usePrevious({ seekIndex, seekTime });

  useEffect(() => {
    if (canvas.current) {
      canvas.current!.width = 160;
      let rowCount;
      if (message.frame && message.frame.size) {
        rowCount = Math.ceil(message.frame.size / 8);
      } else {
        rowCount = Math.ceil(DbcUtils.maxMessageSize(message) / 8);
      }

      const observer = new IntersectionObserver(updateCanvas);
      observer.observe(canvas.current);
    }
  }, []);

  useEffect(() => {
    if (
      previous?.seekIndex !== seekIndex ||
      Math.floor(previous.seekTime * 60) !== Math.floor(seekTime * 60)
    ) {
      updateCanvas();
    }
  }, [seekIndex, seekTime]);

  const canvasInView = () => {
    if (message.id === '130:25')
      console.log(message.id, canvas?.current!.getBoundingClientRect().y);
    return (
      !window.visualViewport ||
      !canvas.current ||
      (canvas?.current.getBoundingClientRect().y >= 140 &&
        window.visualViewport.height >= canvas?.current.getBoundingClientRect().y)
    );
  };

  const findMostRecentMessage = useCallback(
    (time: number) => {
      let mostRecentMessageIndex = null;
      if (time >= lastSeekTime) {
        for (let i = lastMessageIndex; i < message.entries.length; ++i) {
          const msg = message.entries[i];
          if (msg && msg.relTime >= time) {
            mostRecentMessageIndex = i;
            break;
          }
        }
      }

      if (!mostRecentMessageIndex) {
        // TODO this can be faster with binary search, not currently a bottleneck though.

        mostRecentMessageIndex = message.entries.findIndex((e) => e.relTime >= time);
      }

      if (mostRecentMessageIndex) {
        setLastMessageIndex(mostRecentMessageIndex);
        setLastSeekTime(time);

        return message.entries[mostRecentMessageIndex];
      }
    },
    [lastSeekTime, lastMessageIndex, message, seekTime],
  );

  const updateCanvas = () => {
    if (!canvas.current || message.entries.length === 0 || !canvasInView()) {
      return;
    }

    let mostRecentMsg: MessageEntry | undefined = message.entries[message.entries.length - 1];
    if (!isLive) {
      mostRecentMsg = findMostRecentMessage(seekTime);

      if (!mostRecentMsg) {
        mostRecentMsg = message.entries[0];
      }
    }

    const ctx = canvas.current.getContext('2d');

    for (let i = 0; i < message.byteStateChangeCounts.length; ++i) {
      const hexData = mostRecentMsg.hexData.substr(i * 2, 2);

      const x = (i % 8) * 20;
      const y = Math.floor(i / 8) * 20;

      ctx!.fillStyle = message.byteColors[i];
      ctx!.fillRect(x, y, 20, 20);

      // TODO: get font based on OS:
      // const fontMonoLinux = `"Droid Sans Mono", "monospace", monospace, "Droid Sans Fallback"`;
      // const fontMonoWin = `Consolas, "Courier New", monospace`;
      // const fontMonoMac = `Menlo, Monaco, "Courier New", monospace`;
      ctx!.font = '13px Monaco';
      ctx!.fillStyle = 'white';
      ctx!.fillText(hexData ? hexData : '-', x + 2, y + 15);
    }
  };

  return <canvas ref={canvas} height={20}></canvas>;
}

function shouldNotUpdate(prevProps: Props, nextProps: Props) {
  if (nextProps.isLive && nextProps.message.entries.length) {
    const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
    const curLastEntry = prevProps.message.entries[prevProps.message.entries.length - 1];

    return !(!nextLastEntry || !curLastEntry || nextLastEntry.hexData !== curLastEntry.hexData);
  }
  return prevProps.seekTime === nextProps.seekTime;
}

export default memo(MessageBytes, shouldNotUpdate);

type Props = {
  isLive: boolean;
  message: Message;
  seekTime: number;
  seekIndex: number;
};
