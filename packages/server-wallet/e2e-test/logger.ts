import * as fs from 'fs';
import * as path from 'path';

import pino from 'pino';

const ARTIFACTS_DIR = '../../artifacts';

try {
  fs.mkdirSync(ARTIFACTS_DIR);
} catch (err) {
  if (err.message !== "EEXIST: file already exists, mkdir '../../artifacts'") throw err;
}

const destination = pino.destination(path.join(ARTIFACTS_DIR, 'e2e.log'));
export const logger = pino({}, destination);
