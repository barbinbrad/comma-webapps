export default function debounce(callback: Function, delay: number) {
  let timeoutId: number;
  return (...args: any) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, delay);
  };
}
