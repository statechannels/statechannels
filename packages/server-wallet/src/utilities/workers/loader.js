const path = require('path');

require('ts-node').register({typeCheck: false});
require(path.resolve(__dirname, './worker.ts'));
