import {bigNumberify, defaultAbiCoder, keccak256} from 'ethers/utils';
import {Channel} from '..';
import {decodeOutcome} from './outcome';
import {hashState, State, VariablePart} from './state';
import {Bytes32} from './types';

export function hashChallengeMessage(challengeState: State): Bytes32 {
  return keccak256(
    defaultAbiCoder.encode(['bytes32', 'string'], [hashState(challengeState), 'forceMove'])
  );
}

export interface ChallengeRegisteredEvent {
  challengerAddress: string;
  finalizesAt: string;
  challengeStates: State[];
}
export function getChallengeRegisteredEvent(eventResult): ChallengeRegisteredEvent {
  const [event] = eventResult.slice(-1);
  const {
    turnNumRecord,
    finalizesAt,
    challenger,
    isFinal,
    fixedPart,
    variableParts: variablePartsUnstructured,
  } = event.args;

  // Fixed part
  const chainId = bigNumberify(fixedPart[0]).toHexString();
  const participants = fixedPart[1].map(p => bigNumberify(p).toHexString());
  const channelNonce = bigNumberify(fixedPart[2]).toHexString();
  const appDefinition = fixedPart[3];
  const challengeDuration = bigNumberify(fixedPart[4]).toNumber();

  // Variable part
  const variableParts: VariablePart[] = variablePartsUnstructured.map(v => {
    const outcome = v[0];
    const appData = v[1];
    return {outcome, appData};
  });

  const channel: Channel = {chainId, channelNonce, participants};
  const challengeStates: State[] = variableParts.map((v, i) => {
    const turnNum = turnNumRecord - (variableParts.length - i - 1);
    return {
      turnNum,
      channel,
      outcome: decodeOutcome(v.outcome),
      appData: v.appData,
      challengeDuration,
      appDefinition,
      isFinal,
    };
  });
  return {challengeStates, finalizesAt, challengerAddress: challenger};
}
