import { WalletState } from '../states';
import { OWN_COMMITMENT_RECEIVED, OPPONENT_COMMITMENT_RECEIVED, WalletAction } from '../redux/actions';
import { signatureFailure, signatureSuccess, validationFailure, validationSuccess, WalletEvent } from 'magmo-wallet-client';
import { signCommitment, validCommitmentSignature } from './signing-utils';

export function handleSignatureAndValidationMessages(state: WalletState, action: WalletAction): WalletEvent | undefined {
  switch (action.type) {
    case OWN_COMMITMENT_RECEIVED:
      if (state.stage !== "RUNNING") {
        return signatureFailure('WalletBusy');
      } else {

        const signature = signCommitment(action.commitment, state.privateKey);

        return signatureSuccess(signature);


      }
    case OPPONENT_COMMITMENT_RECEIVED:
      if (state.stage !== "RUNNING") {
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
