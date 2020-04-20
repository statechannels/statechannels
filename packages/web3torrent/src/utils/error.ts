import {UserDeclinedErrorCode, EthereumNotEnabledErrorCode} from '@statechannels/channel-client';

export function getUserFriendlyError(errorCode) {
  switch (errorCode) {
    case UserDeclinedErrorCode:
      return 'You declined the budget in the wallet. To proceed you must allow the wallet to create the budget.';
    case EthereumNotEnabledErrorCode:
      // TODO: Do we have see this error?
      return 'Ethereum is not enabled in your browser';
    default:
      return 'Something went wrong';
  }
}
