import {Bytes32} from './types';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {hashState, FixedPart, VariablePart, State} from './state';
import {Channel} from '..';
import {decodeOutcome} from './outcome';

export function hashChallengeMessage(challengeState: State): Bytes32 {
  return keccak256(
    defaultAbiCoder.encode(['bytes32', 'string'], [hashState(challengeState), 'forceMove']),
  );
}

export interface ChallengeRegisteredEvent {
  challengerAddress: string;
  finalizesAt: string;
  challengeStates: State[];
}
export function getChallengeRegisteredEvent({
  turnNumRecord,
  finalizesAt,
  challenger,
  isFinal,
  fixedPart,
  variableParts,
}: {
  turnNumRecord: number;
  finalizesAt: string;
  challenger: string;
  isFinal: boolean;
  variableParts: VariablePart[];
  fixedPart: FixedPart;
}): ChallengeRegisteredEvent {
  const {chainId, channelNonce, participants} = fixedPart;
  const channel: Channel = {chainId, channelNonce, participants};
  const challengeStates: State[] = variableParts.map((v, i) => {
    const outcome = decodeOutcome(v.outcome);
    const turnNum = turnNumRecord - (variableParts.length - i - 1);
    return {
      turnNum,
      channel,
      outcome,
      appData: v.appData,
      challengeDuration: fixedPart.challengeDuration,
      appDefinition: fixedPart.appDefinition,
      isFinal,
    };
  });
  return {challengeStates, finalizesAt, challengerAddress: challenger};
}
