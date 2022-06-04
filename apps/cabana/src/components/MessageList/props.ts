import { Messages, Route } from '~/types';

export type Props = {
  messages: Messages;
  selectedMessages: string[];
  showEditMessageModal: (message: string) => void;
  currentParts: [number, number];
  onMessageSelected: (key: string) => void;
  onMessageUnselected: () => void;
  dbcFilename: string;
  dbcLastSaved: any;
  route: Route | null;
  seekTime: number;
  seekIndex: number;
  shareUrl: string | null;
  isDemo: boolean;
  isLive: boolean;
};
