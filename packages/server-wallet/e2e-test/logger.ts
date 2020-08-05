import * as fs from 'fs';
import * as path from 'path';

import pino from 'pino';

const ARTIFACTS_DIR = '../../artifacts';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR);
}

const destination = pino.destination(path.join(ARTIFACTS_DIR, 'e2e.log'));
export const logger = pino({}, destination);
