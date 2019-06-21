import { CommitmentsReceived, BaseProcessAction } from '../../../communication';
import { WalletAction } from '../../actions';
import { ActionConstructor } from '../../utils';

export interface ClearedToSend extends BaseProcessAction {
  type: 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND';
}

export type AdvanceChannelAction = CommitmentsReceived | ClearedToSend;

export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  const { processId } = p;
  return {
    type: 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND',
    processId,
  };
};

export function isAdvanceChannelAction(action: WalletAction): action is AdvanceChannelAction {
  return (
    action.type === 'WALLET.ADVANCE_CHANNEL.COMMITMENTS_RECEIVED' ||
    action.type === 'WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND'
  );
}
