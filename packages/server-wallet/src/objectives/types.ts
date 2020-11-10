import {Logger} from 'pino';
import {ChannelResult} from '@statechannels/client-api-schema';
import {ChainServiceInterface} from '@statechannels/chain-service';

import {Store} from '../wallet/store';
import {Outgoing} from '../protocols/actions';
import {WalletEvent} from '../wallet';

export interface ObjectiveManagerParams {
  store: Store;
  logger: Logger;
  chainService: ChainServiceInterface;
  timingMetrics: boolean;
}

// todo: currently duplicated in wallet/index.ts
export type ExecutionResult = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  events?: WalletEvent[];
  error?: any;
};
