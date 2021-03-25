import {Logger} from 'pino';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Store} from '../engine/store';
import {ChainServiceInterface} from '../chain-service';
import {Outgoing} from '../protocols/actions';
import {EngineEvent} from '../engine/types';

export interface ObjectiveManagerParams {
  store: Store;
  logger: Logger;
  chainService: ChainServiceInterface;
  timingMetrics: boolean;
}

// TODO: currently duplicated in wallet/index.ts
export type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  events?: EngineEvent[];
  error?: any;
};
