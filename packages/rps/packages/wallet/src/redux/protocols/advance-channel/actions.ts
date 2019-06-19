import { RoundReceived } from '../../../communication';
import { WalletAction } from '../../actions';

export type AdvanceChannelAction = RoundReceived;

export function isAdvanceChannelAction(action: WalletAction): action is AdvanceChannelAction {
  return action.type === 'WALLET.ADVANCE_CHANNEL.ROUND_RECEIVED';
}
