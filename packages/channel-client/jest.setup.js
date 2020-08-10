// eslint-disable-next-line @typescript-eslint/no-var-requires
const setGlobalVars = require('indexeddbshim');

global.window = global; // We'll allow ourselves to use `window.indexedDB` or `indexedDB` as a global
setGlobalVars(); // See signature below
