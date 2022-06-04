import type { Moment } from 'moment';
import { Messages, Thumbnail } from '~/types';

export type Props = {
  autoplay: boolean;
  borderColor: string;
  currentParts: [number, number];
  firstCanTime: number | null;
  maxqcamera?: number;
  messages: Messages;
  routeStartTime?: Moment;
  url?: string | null;
  seekIndex: number;
  selectedMessage: string | null;
  startSegments?: number[];
  startTime: number;
  thumbnails: Thumbnail[];
  videoOffset: number;
  onSeek: (index: number, time: number) => void;
  onUserSeek: (time: number) => void;
};
