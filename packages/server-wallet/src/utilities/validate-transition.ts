import _ from 'lodash';
import {SignedState, StateWithHash, toNitroState} from '@statechannels/wallet-core';
import {constants} from 'ethers';

import {logger} from '../logger';
import {validateTransitionWithEVM} from '../evm-validator';
import {Bytes} from '../type-aliases';
import {Channel} from '../models/channel';

export function shouldValidateTransition(incomingState: StateWithHash, channel: Channel): boolean {
  const {supported, isLedger} = channel;
  // If we already have the state we should of already validated it
  const alreadyHaveState = _.some(channel.sortedStates, ['stateHash', incomingState.stateHash]);

  // Ignore older states that may be added via syncing
  const isOldState = incomingState.turnNum < (supported?.turnNum || 0);

  return !!supported && !isOldState && !alreadyHaveState && !isLedger;
}
// Port of the following solidity code
// https://github.com/statechannels/statechannels/blob/a3d21827e340c0cc086f1abad7685345885bf245/packages/nitro-protocol/contracts/ForceMove.sol#L492-L534
export async function validateTransition(
  fromState: SignedState,
  toState: SignedState,
  bytecode: Bytes = '0x',
  skipEvmValidation = false
): Promise<boolean> {
  const fromMoverIndex = fromState.turnNum % fromState.participants.length;
  const fromMover = fromState.participants[fromMoverIndex].signingAddress;

  const toMoverIndex = toState.turnNum % toState.participants.length;
  const toMover = toState.participants[toMoverIndex].signingAddress;

  if (fromState.appDefinition !== constants.AddressZero) {
    // turn numbers not relevant for the null app
    const turnNumCheck = _.isEqual(toState.turnNum, fromState.turnNum + 1);
    if (!turnNumCheck) {
      const VALIDATION_ERROR = `Turn number check failed.`;
      logger.error({fromState, toState, error: Error(VALIDATION_ERROR)}, VALIDATION_ERROR);
    }
  }

  const constantsCheck =
    _.isEqual(toState.chainId, fromState.chainId) &&
    _.isEqual(toState.participants, fromState.participants) &&
    _.isEqual(toState.appDefinition, fromState.appDefinition) &&
    _.isEqual(toState.challengeDuration, fromState.challengeDuration);

  if (!constantsCheck) {
    const VALIDATION_ERROR = `Constants check failed.`;
    logger.error(
      {
        fromState,
        toState,
        error: Error(VALIDATION_ERROR),
      },
      VALIDATION_ERROR
    );
  }

  const signatureValidation =
    fromState.signatures.some(s => s.signer === fromMover) &&
    toState.signatures.some(s => s.signer === toMover);

  if (!signatureValidation) {
    const VALIDATION_ERROR = `Signature validation failed.`;
    logger.error({fromState, toState, error: Error(VALIDATION_ERROR)}, VALIDATION_ERROR);
    return false;
  }

  // Final state specific validation
  if (toState.isFinal && !_.isEqual(fromState.outcome, toState.outcome)) {
    const VALIDATION_ERROR = `Outcome changed on a final state.`;
    logger.error({fromState, toState, error: Error(VALIDATION_ERROR)}, VALIDATION_ERROR);
    return false;
  }

  // Funding stage specific validation
  const isInFundingStage = toState.turnNum < 2 * toState.participants.length;
  const fundingStageValidation =
    _.isEqual(fromState.isFinal, false) &&
    _.isEqual(toState.outcome, fromState.outcome) &&
    _.isEqual(toState.appData, fromState.appData);

  if (isInFundingStage && !fundingStageValidation) {
    const VALIDATION_ERROR = `Invalid setup state transition.`;

    logger.error({fromState, toState, error: Error(VALIDATION_ERROR)}, VALIDATION_ERROR);

    return false;
  }

  // Validates app specific rules by running the app rules contract in the EVM
  // We only want to run the validation for states not in a funding or final stage
  // per the force move contract
  if (!skipEvmValidation && !isInFundingStage && !toState.isFinal) {
    const evmValidation = await validateTransitionWithEVM(
      toNitroState(fromState),
      toNitroState(toState),
      bytecode
    );

    if (!evmValidation) {
      logger.error({fromState, toState}, 'EVM Validation failure');
      return false;
    }
  }

  return true;
}
