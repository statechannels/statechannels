import isEqual from 'lodash.isequal';

import {State} from './contract/state';

export enum Status {
  True,
  NeedToCheckApp,
}

/**
 *  Port of ForceMove#_requireValidProtocolTransition solidity code
 * either:
 * - returns Status.True (no further checks required)
 * - returns  Status.NeedToCheckApp (clears protocol checks, overall validity requires App.validTransition)
 * - throws an error
 *  */
export function requireValidProtocolTransition(fromState: State, toState: State): Status {
  // explicit checks of expressions checked implicitly on chain
  _requireExtraImplicitChecks(fromState, toState);

  // directly ported checks:
  if (toState.isFinal) {
    _require(
      isEqual(toState.outcome, fromState.outcome),
      'InvalidTransitionError: Cannot move to a final state with a different default outcome'
    );
  } else {
    _require(
      !fromState.isFinal,
      'InvalidTransitionError: Cannot move from a final state to a non final state'
    );
    if (toState.turnNum < 2 * toState.channel.participants.length) {
      _require(
        isEqual(toState.outcome, fromState.outcome),
        'InvalidTransitionError: Cannot change the default outcome during setup phase'
      );
      _require(
        toState.appData == fromState.appData,
        'InvalidTransitionError: Cannot change the appData during setup phase'
      );
    } else {
      return Status.NeedToCheckApp;
    }
  }
  return Status.True;
}

function _requireExtraImplicitChecks(fromState: State, toState: State) {
  // turnNum this is only checked *implicitly* on chain
  _require(toState.turnNum == fromState.turnNum + 1, 'turnNum must increment by one');

  // constants: these are only checked *implicitly* on chain
  _require(toState.channel.chainId == fromState.channel.chainId, 'chainId must not change');
  _require(
    isEqual(toState.channel.participants, fromState.channel.participants),
    'participants must not change'
  );
  _require(
    toState.channel.channelNonce == fromState.channel.channelNonce,
    'channelNonce must not change'
  );
  _require(toState.appDefinition == fromState.appDefinition, 'appDefinition must not change');
  _require(
    toState.challengeDuration == fromState.challengeDuration,
    'challengeDuration must not change'
  );
}

function _require(expression, errorString: string) {
  if (!expression) throw Error(errorString);
}
