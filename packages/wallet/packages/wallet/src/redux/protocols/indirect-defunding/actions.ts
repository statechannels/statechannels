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
  type: 'WALLET.INDIRECT_DEFUNDING.CLEARED_TO_SEND';
  protocolLocator: ProtocolLocator;
}

// --------
// Constructors
// --------
export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  return {
    ...p,
    type: 'WALLET.INDIRECT_DEFUNDING.CLEARED_TO_SEND',
  };
};

// --------
// Unions and Guards
// --------

export type IndirectDefundingAction = ConsensusUpdateAction | AdvanceChannelAction | ClearedToSend;

export function isIndirectDefundingAction(action: WalletAction): action is IndirectDefundingAction {
  return (
    action.type === 'WALLET.INDIRECT_DEFUNDING.CLEARED_TO_SEND' ||
    isConsensusUpdateAction(action) ||
    isAdvanceChannelAction(action)
  );
}
export const routesToIndirectDefunding = routerFactory(
  isConsensusUpdateAction,
  EmbeddedProtocol.IndirectDefunding,
);
