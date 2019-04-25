import { ChannelState } from '../redux/channel-store/state';
import * as actions from '../redux/actions';
import {
  signatureFailure,
  signatureSuccess,
  validationFailure,
  validationSuccess,
  WalletEvent,
} from 'magmo-wallet-client';
import { signCommitment, validCommitmentSignature } from './signing-utils';

export function handleSignatureAndValidationMessages(
  state: ChannelState,
  action: actions.WalletAction,
): WalletEvent | undefined {
  switch (action.type) {
    case actions.channel.OWN_COMMITMENT_RECEIVED:
      if (state.stage !== 'RUNNING') {
        return signatureFailure('WalletBusy');
      } else {
        const signature = signCommitment(action.commitment, state.privateKey);

        return signatureSuccess(signature);
      }
    case actions.channel.OPPONENT_COMMITMENT_RECEIVED:
      if (state.stage !== 'RUNNING') {
        return validationFailure('WalletBusy');
      } else {
        const opponentAddress = state.participants[1 - state.ourIndex];

        if (!action.signature) {
          return validationFailure('InvalidSignature');
        }
        const messageSignature = action.signature as string;
        if (!validCommitmentSignature(action.commitment, messageSignature, opponentAddress)) {
          return validationFailure('InvalidSignature');
        }

        return validationSuccess();
      }
      break;
  }
  return undefined;
}
