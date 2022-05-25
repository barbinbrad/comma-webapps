// eslint-disable-next-line import/prefer-default-export
export function hash(str: string) {
  let h = 5381;
  let i = str.length;

  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i);
  }

  // to positive number
  return (h >>> 0).toString(16);
}
