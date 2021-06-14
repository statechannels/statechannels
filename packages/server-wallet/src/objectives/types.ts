import {Logger} from 'pino';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Store} from '../engine/store';
import {Outgoing} from '../protocols/actions';

export interface ObjectiveManagerParams {
  store: Store;
  logger: Logger;
  timingMetrics: boolean;
}

// TODO: currently duplicated in wallet/index.ts
export type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  error?: any;
};
