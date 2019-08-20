import { WalletAction } from '../../actions';
import { ConsensusUpdateAction, isConsensusUpdateAction } from '../consensus-update';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';
import {
  routerFactory,
  EmbeddedProtocol,
  BaseProcessAction,
  ProtocolLocator,
} from '../../../communication';
import { ActionConstructor } from '../../utils';
// -------
// Actions
// -------
export interface ClearedToSend extends BaseProcessAction {
  type: 'WALLET.LEDGER_DEFUNDING.CLEARED_TO_SEND';
  protocolLocator: ProtocolLocator;
}

// --------
// Constructors
// --------
export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  return {
    ...p,
    type: 'WALLET.LEDGER_DEFUNDING.CLEARED_TO_SEND',
  };
};

// --------
// Unions and Guards
// --------

export type LedgerDefundingAction = ConsensusUpdateAction | AdvanceChannelAction | ClearedToSend;

export function isLedgerDefundingAction(action: WalletAction): action is LedgerDefundingAction {
  return (
    action.type === 'WALLET.LEDGER_DEFUNDING.CLEARED_TO_SEND' ||
    isConsensusUpdateAction(action) ||
    isAdvanceChannelAction(action)
  );
}
export const routesToLedgerDefunding = routerFactory(
  isLedgerDefundingAction,
  EmbeddedProtocol.LedgerDefunding,
);
