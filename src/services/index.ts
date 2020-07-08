import * as LedgerChannelManager from './ledgerChannelManager';
import {SignedState, State} from '../store-types';

export const updateLedgerChannel: (
  ledgerStateRound: SignedState[],
  currentC?: State
) => Promise<SignedState> = LedgerChannelManager.updateLedgerChannel;
