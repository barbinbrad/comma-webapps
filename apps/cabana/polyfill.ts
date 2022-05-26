import path from 'path';

const modules = path.resolve(__dirname, '../../node_modules');

const polyfills = {
  buffer: 'buffer',
  process: 'process-es6',
  util: modules + '/rollup-plugin-node-polyfills/polyfills/util.js',
  sys: modules + '/util',
  events: modules + '/rollup-plugin-node-polyfills/polyfills/events.js',
  stream: modules + '/rollup-plugin-node-polyfills/polyfills/stream.js',
  path: modules + '/rollup-plugin-node-polyfills/polyfills/path.js',
  querystring: modules + '/rollup-plugin-node-polyfills/polyfills/qs.js',
  punycode: modules + '/rollup-plugin-node-polyfills/polyfills/punycode.js',
  url: modules + '/rollup-plugin-node-polyfills/polyfills/url.js',
  string_decoder: modules + '/rollup-plugin-node-polyfills/polyfills/string-decoder.js',
  http: modules + '/rollup-plugin-node-polyfills/polyfills/http.js',
  https: modules + '/rollup-plugin-node-polyfills/polyfills/http.js',
  os: modules + '/rollup-plugin-node-polyfills/polyfills/os.js',
  assert: modules + '/rollup-plugin-node-polyfills/polyfills/assert.js',
  constants: modules + '/rollup-plugin-node-polyfills/polyfills/constants.js',
  _stream_duplex: modules + '/rollup-plugin-node-polyfills/polyfills/readable-stream/duplex.js',
  _stream_passthrough:
    modules + '/rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough.js',
  _stream_readable: modules + '/rollup-plugin-node-polyfills/polyfills/readable-stream/readable.js',
  _stream_writable: modules + '/rollup-plugin-node-polyfills/polyfills/readable-stream/writable.js',
  _stream_transform:
    modules + '/rollup-plugin-node-polyfills/polyfills/readable-stream/transform.js',
  timers: modules + '/rollup-plugin-node-polyfills/polyfills/timers.js',
  console: modules + '/rollup-plugin-node-polyfills/polyfills/console.js',
  vm: modules + '/rollup-plugin-node-polyfills/polyfills/vm.js',
  zlib: modules + '/rollup-plugin-node-polyfills/polyfills/zlib.js',
  tty: modules + '/rollup-plugin-node-polyfills/polyfills/tty.js',
  domain: modules + '/rollup-plugin-node-polyfills/polyfills/domain.js',
};

export default polyfills;
