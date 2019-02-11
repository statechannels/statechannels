import { WalletState } from '../states';
import { OWN_POSITION_RECEIVED, OPPONENT_POSITION_RECEIVED, WalletAction } from '../redux/actions';
import { signatureFailure, signatureSuccess, validationFailure, validationSuccess, WalletEvent } from 'magmo-wallet-client';
import { signPositionHex, validSignature } from './signing-utils';

export function handleSignatureAndValidationMessages(state: WalletState, action: WalletAction): WalletEvent | undefined {
  switch (action.type) {
    case OWN_POSITION_RECEIVED:
      if (state.stage !== "RUNNING") {
        return signatureFailure('WalletBusy');
      } else {
        const data = action.data;
        // check it's our turn

        const signature = signPositionHex(data, state.privateKey);

        return signatureSuccess(signature);


      }
    case OPPONENT_POSITION_RECEIVED:
      if (state.stage !== "RUNNING") {
        return validationFailure('WalletBusy');

      } else {
        const opponentAddress = state.participants[1 - state.ourIndex];

        if (!action.signature) {
          return validationFailure('InvalidSignature');
        }
        const messageSignature = action.signature as string;
        if (!validSignature(action.data, messageSignature, opponentAddress)) {
          return validationFailure('InvalidSignature');
        }

        return validationSuccess();
      }
      break;
  }
  return undefined;
}
