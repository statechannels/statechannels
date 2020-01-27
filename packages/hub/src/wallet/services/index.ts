import {SignedState, State} from '@statechannels/nitro-protocol';
import {Address, Uint256} from '../../types';
import {Blockchain} from './blockchain';
import * as LedgerChannelManager from './ledgerChannelManager';

export const updateLedgerChannel: (
  ledgerStateRound: SignedState[],
  currentC?: State
) => Promise<SignedState> = LedgerChannelManager.updateLedgerChannel;

export const fund: (id: Address, expectedHeld: Uint256, amount: Uint256) => Promise<Uint256> =
  Blockchain.fund;
