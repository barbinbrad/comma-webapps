/* eslint-disable prefer-destructuring */
/* eslint-disable react/destructuring-assignment */
import { Component } from 'react';
import { theme } from 'design';
import DbcUtils from '~/models/can/utils';
import { Message, MessageEntry } from '~/types';

export default class MessageBytes extends Component<Props, State> {
  canvas?: HTMLCanvasElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      isVisible: true,
      lastMessageIndex: 0,
      lastSeekTime: 0,
      maxMessageBytes: 0,
    };

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onCanvasRefAvailable = this.onCanvasRefAvailable.bind(this);
    this.updateCanvas = this.updateCanvas.bind(this);
    this.canvasInView = this.canvasInView.bind(this);
  }

  componentDidMount() {
    this.componentDidUpdate({
      isLive: false,
      message: {
        id: '',
        bus: 0,
        address: 0,
        entries: [],
        byteColors: [],
        byteStateChangeCounts: [],
        frame: undefined,
        lastUpdated: 0,
      },
      seekTime: 0,
      seekIndex: 0,
    });
  }

  shouldComponentUpdate(nextProps: Props) {
    if (nextProps.isLive && nextProps.message.entries.length) {
      const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
      const curLastEntry = this.props.message.entries[this.props.message.entries.length - 1];

      return !nextLastEntry || !curLastEntry || nextLastEntry.hexData !== curLastEntry.hexData;
    }
    return nextProps.seekTime !== this.props.seekTime;
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.message !== this.props.message) {
      let rowCount;
      if (this.props.message.frame && this.props.message.frame.size) {
        rowCount = Math.ceil(this.props.message.frame.size / 8);
      } else {
        rowCount = Math.ceil(
          DbcUtils.maxMessageSize(this.props.message, this.state.maxMessageBytes) / 8,
        );
      }
      if (this.canvas) {
        this.canvas.height = rowCount * 15;
      }
    }

    if (
      prevProps.seekIndex !== this.props.seekIndex ||
      Math.floor(prevProps.seekTime * 60) !== Math.floor(this.props.seekTime * 60)
    ) {
      this.updateCanvas();
    }
  }

  onVisibilityChange(isVisible: boolean) {
    if (isVisible !== this.state.isVisible) {
      this.setState({ isVisible });
    }
  }

  onCanvasRefAvailable(ref: HTMLCanvasElement) {
    if (!ref) return;

    this.canvas = ref;
    this.canvas.width = 160;
    let rowCount;
    if (this.props.message.frame && this.props.message.frame.size) {
      rowCount = Math.ceil(this.props.message.frame.size / 8);
    } else {
      rowCount = Math.ceil(
        DbcUtils.maxMessageSize(this.props.message, this.state.maxMessageBytes) / 8,
      );
    }
    this.canvas.height = rowCount * 15;

    const observer = new IntersectionObserver(this.updateCanvas);
    observer.observe(this.canvas);
  }

  canvasInView() {
    return (
      !window.visualViewport ||
      !this.canvas ||
      (this.canvas.getBoundingClientRect().y >= 140 &&
        window.visualViewport.height >= this.canvas.getBoundingClientRect().y)
    );
  }

  findMostRecentMessage(seekTime: number) {
    const { message } = this.props;
    const { lastMessageIndex, lastSeekTime } = this.state;
    let mostRecentMessageIndex = null;
    if (seekTime >= lastSeekTime) {
      for (let i = lastMessageIndex; i < message.entries.length; ++i) {
        const msg = message.entries[i];
        if (msg && msg.relTime >= seekTime) {
          mostRecentMessageIndex = i;
          break;
        }
      }
    }

    if (!mostRecentMessageIndex) {
      // TODO this can be faster with binary search, not currently a bottleneck though.

      mostRecentMessageIndex = message.entries.findIndex((e) => e.relTime >= seekTime);
    }

    if (mostRecentMessageIndex) {
      this.setState({
        lastMessageIndex: mostRecentMessageIndex,
        lastSeekTime: seekTime,
      });
      return message.entries[mostRecentMessageIndex];
    }

    return undefined;
  }

  updateCanvas() {
    const { message, isLive, seekTime } = this.props;
    if (!this.canvas || message.entries.length === 0 || !this.canvasInView()) {
      return;
    }

    let mostRecentMsg: MessageEntry | undefined = message.entries[message.entries.length - 1];
    if (!isLive) {
      mostRecentMsg = this.findMostRecentMessage(seekTime);

      if (!mostRecentMsg) {
        mostRecentMsg = message.entries[0];
      }
    }

    const ctx = this.canvas.getContext('2d');
    // ctx.clearRect(0, 0, 180, 15);

    for (let i = 0; i < message.byteStateChangeCounts.length; ++i) {
      const hexData = mostRecentMsg.hexData.substr(i * 2, 2);

      const x = (i % 8) * 20;
      const y = Math.floor(i / 8) * 15;

      ctx!.fillStyle = message.byteColors[i];
      ctx!.fillRect(x, y, 20, 15);

      ctx!.font = `12px ${theme.fonts.mono}`;
      ctx!.fillStyle = 'black';
      ctx!.fillText(hexData || '-', x + 2, y + 12);
    }
  }

  render() {
    return (
      <canvas
        ref={this.onCanvasRefAvailable}
        className="cabana-meta-messages-list-item-bytes-canvas"
      />
    );
  }
}

type Props = {
  isLive: boolean;
  message: Message;
  seekTime: number;
  seekIndex: number;
};

type State = {
  isVisible: boolean;
  lastMessageIndex: number;
  lastSeekTime: number;
  maxMessageBytes: number;
};
