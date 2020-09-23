// const {threadId} = require('worker_threads');
const path = require('path');
// const fs = require('fs');

// const TS_WORKER_PATH = path.resolve(__dirname, './worker.ts');
const target = 'worker.js';
const BUILT_JS_WORKER_PATH = path.resolve(__dirname, target);

require(BUILT_JS_WORKER_PATH);

// console.log(`Loading ${threadId}`);

// if (fs.existsSync(JS_WORKER_PATH)) {
//   console.log('Loading JS worker path');
//   require(JS_WORKER_PATH);
// } else if (fs.existsSync(BUILT_JS_WORKER_PATH)) {
//   console.log('Loading built JS worker path');
//   require(BUILT_JS_WORKER_PATH);
// } else if (fs.existsSync(TS_WORKER_PATH)) {
//   console.warn('Using ts-node to load the worker script, things may be slow!');
//   console.log('Loading TS worker path');
//   require('ts-node').register({typeCheck: false});
//   require(TS_WORKER_PATH);
// } else {
//   console.error('no luck.');
//   throw new Error('Could not find worker.ts or worker.js');
// }
