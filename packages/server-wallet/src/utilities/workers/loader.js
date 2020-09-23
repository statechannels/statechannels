const path = require('path');
const fs = require('fs');

const TS_WORKER_PATH = path.resolve(__dirname, './worker.ts');
const JS_WORKER_PATH = path.resolve(__dirname, './worker.js');
const BUILT_JS_WORKER_PATH = path.resolve(
  __dirname,
  '../../../lib/src/utilities/workers/worker.js'
);

if (fs.existsSync(JS_WORKER_PATH)) {
  require(JS_WORKER_PATH);
} else if (fs.existsSync(BUILT_JS_WORKER_PATH)) {
  require(BUILT_JS_WORKER_PATH);
} else if (fs.existsSync(TS_WORKER_PATH)) {
  console.warn('Using ts-node to load the worker script, things may be slow!');
  require('ts-node').register({typeCheck: false});
  require(TS_WORKER_PATH);
} else {
  throw new Error('Could not find worker.ts or worker.js');
}
