import type { Moment } from 'moment';
import { Message, Messages, Thumbnail } from '~/types';

export type Props = {
  autoplay: boolean;
  canFrameOffset: number;
  currentParts: [number, number];
  firstCanTime: number | null;
  isLive: boolean;
  maxqcamera?: number;
  messages: Messages;
  partsCount?: number;
  partsLoaded: number;
  routeStartTime?: Moment;
  url?: string | null;
  seekTime: number;
  seekIndex: number;
  selectedMessage: string | null;
  selectedPart: number;
  startSegments?: number[];
  startTime: number;
  thumbnails: Thumbnail[];
  videoOffset: number;
  onConfirmedSignalChange: (
    message: Message,
    signals: {
      [key: string]: any;
    },
  ) => void;
  onSeek: (index: number, time: number) => void;
  onUserSeek: (time: number) => void;
  onPartChange: (part: number) => void;
  showEditMessageModal: (msgKey: string) => void;
};
