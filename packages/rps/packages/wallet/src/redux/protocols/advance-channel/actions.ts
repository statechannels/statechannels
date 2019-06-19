import { CommitmentsReceived } from '../../../communication';
import { WalletAction } from '../../actions';

export type AdvanceChannelAction = CommitmentsReceived;

export function isAdvanceChannelAction(action: WalletAction): action is AdvanceChannelAction {
  return action.type === 'WALLET.ADVANCE_CHANNEL.COMMITMENTS_RECEIVED';
}
