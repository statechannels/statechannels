import { WalletState } from '../states';
import { OWN_POSITION_RECEIVED, OPPONENT_POSITION_RECEIVED, WalletAction } from '../redux/actions';
import { signatureFailure, signatureSuccess, validationFailure, validationSuccess, SignatureFailureReasons, ValidationFailureReasons, ResponseAction } from '../interface/outgoing';
import { signPositionHex, validSignature } from './signing-utils';

export function handleSignatureAndValidationMessages(state: WalletState, action: WalletAction): ResponseAction | undefined {
  switch (action.type) {
    case OWN_POSITION_RECEIVED:
      if (state.stage !== "RUNNING") {
        return signatureFailure(SignatureFailureReasons.WalletBusy);
      } else {
        const data = action.data;
        // check it's our turn

        const signature = signPositionHex(data, state.privateKey);

        return signatureSuccess(signature);


      }
    case OPPONENT_POSITION_RECEIVED:
      if (state.stage !== "RUNNING") {
        return validationFailure(ValidationFailureReasons.WalletBusy);

      } else {
        const opponentAddress = state.participants[1 - state.ourIndex];

        if (!action.signature) {
          return validationFailure(ValidationFailureReasons.InvalidSignature);
        }
        const messageSignature = action.signature as string;
        if (!validSignature(action.data, messageSignature, opponentAddress)) {
          return validationFailure(ValidationFailureReasons.InvalidSignature);
        }

        return validationSuccess();
      }
      break;
  }
  return undefined;
}