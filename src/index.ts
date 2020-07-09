import { queries } from './db/queries/channels';

import errors from './errors';
export { errors };

export default class Wallet {
  sanitize: (appAttrs: any) => Bytes;
  updateChannel = queries.updateChannel;

  constructor(sanitizeAppAttrs) {
    this.sanitize = sanitizeAppAttrs;
  }
}
