import * as fs from 'fs';
import * as path from 'path';

import pino from 'pino';

const ARTIFACTS_DIR = '../../artifacts';

export const LOG_PATH = path.join(ARTIFACTS_DIR, 'e2e.log');
try {
  fs.mkdirSync(ARTIFACTS_DIR);
} catch (err) {
  if (err.message !== "EEXIST: file already exists, mkdir '../../artifacts'") throw err;
}

const destination = pino.destination(LOG_PATH);
export const logger = pino({}, destination);
