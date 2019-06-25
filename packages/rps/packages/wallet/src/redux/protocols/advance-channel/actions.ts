import { CommitmentsReceived, BaseProcessAction } from '../../../communication';
import { WalletAction } from '../../actions';
import { ActionConstructor } from '../../utils';

export interface ClearedToSend extends BaseProcessAction {
  type: 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND';
  protocolLocator: string;
}

export type AdvanceChannelAction = CommitmentsReceived | ClearedToSend;

export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  const { processId, protocolLocator } = p;
  return {
    type: 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND',
    processId,
    protocolLocator,
  };
};

export function isAdvanceChannelAction(action: WalletAction): action is AdvanceChannelAction {
  return (
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' ||
    action.type === 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND'
  );
}
