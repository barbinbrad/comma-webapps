import DBC from '../services/dbc';

export type Props = {
  autoplay: boolean;
  startTime: number;
  segments: number[] | undefined;
  isDemo: boolean;
  dongleId?: string;
  name?: string;
  max?: number;
  url?: string;
  exp?: string;
  sig?: string;
  isLegacyShare?: boolean;
  isShare?: boolean;
  dbc?: DBC;
  dbcFilename?: string;
  githubAuthToken?: string;
  unlogger: boolean;
};
