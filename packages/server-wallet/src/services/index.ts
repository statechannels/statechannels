import {SignedState, State} from '@statechannels/nitro-protocol';
import * as LedgerChannelManager from './ledgerChannelManager';

export const updateLedgerChannel: (
  ledgerStateRound: SignedState[],
  currentC?: State
) => Promise<SignedState> = LedgerChannelManager.updateLedgerChannel;
