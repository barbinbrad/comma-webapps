import process from 'process-es6';

export default function getPlatform() {
  if (typeof window !== 'undefined') {
    const { userAgent } = window.navigator;

    return {
      isWin: userAgent.indexOf('Windows') >= 0,
      isMac: userAgent.indexOf('Macintosh') >= 0,
      isLinux: userAgent.indexOf('Linux') >= 0,
    };
  }
  const { platform } = process;
  const isWin = platform === 'win32';
  const isMac = platform === 'darwin';

  return {
    isWin,
    isMac,
    isLinux: !isWin && !isMac,
  };
}
