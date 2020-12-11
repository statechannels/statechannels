import _ from 'lodash';
import {SignedState, StateWithHash, toNitroState, unreachable} from '@statechannels/wallet-core';
import {requireValidProtocolTransition, Status} from '@statechannels/nitro-protocol';
import {Logger} from 'pino';

import {validateAppTransitionWithEVM} from '../evm-validator';
import {Bytes} from '../type-aliases';
import {Channel} from '../models/channel';

export function shouldValidateTransition(incomingState: StateWithHash, channel: Channel): boolean {
  const {supported, isLedger, fundingStrategy} = channel;
  // TODO: This is a temporary workaround for https://github.com/statechannels/statechannels/issues/2842
  // We should figure out a smarter way of handling this
  if (fundingStrategy == 'Fake' && incomingState.turnNum === 3) {
    return false;
  }

  // If we already have the state we should of already validated it
  const alreadyHaveState = _.some(channel.sortedStates, ['stateHash', incomingState.stateHash]);

  // Ignore older states that may be added via syncing
  const isOldState = incomingState.turnNum < (supported?.turnNum || 0);

  // We do not always respect turn numbers in funding stage
  const isInFundingStage = incomingState.turnNum < 2 * incomingState.participants.length;

  return !!supported && !isOldState && !alreadyHaveState && !isLedger && !isInFundingStage;
}
// Port of ForceMove#_requireValidTransition solidity code
export function validateTransition(
  fromState: SignedState,
  toState: SignedState,
  logger: Logger,
  bytecode?: Bytes,
  skipAppTransitionCheck = false
): boolean {
  try {
    const status = requireValidProtocolTransition(toNitroState(fromState), toNitroState(toState));
    switch (status) {
      case Status.True:
        return true;
      case Status.NeedToCheckApp:
        return (
          skipAppTransitionCheck || // TODO this should be removed as soon as possible
          validateAppTransitionWithEVM(toNitroState(fromState), toNitroState(toState), bytecode)
        );
      default:
        return unreachable(status);
    }
  } catch (err) {
    logger.error(err);
    return false;
  }
}
