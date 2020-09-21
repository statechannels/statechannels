const path = require('path');
const fs = require('fs');

const TS_WORKER_PATH = path.resolve(__dirname, './worker.ts');
const JS_WORKER_PATH = path.resolve(__dirname, './worker.js');
if (fs.existsSync(TS_WORKER_PATH)) {
  require('ts-node').register({typeCheck: false});
  require(TS_WORKER_PATH);
} else if (fs.existsSync(JS_WORKER_PATH)) {
  require(JS_WORKER_PATH);
} else {
  throw new Error('Could not find worker.ts or worker.js');
}
