import {Bytes32} from './types';
import {keccak256, defaultAbiCoder, bigNumberify} from 'ethers/utils';
import {hashState, VariablePart, State} from './state';
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
export function getChallengeRegisteredEvent(eventArgs): ChallengeRegisteredEvent {
  // TODO: There must be a better way of parsing out the event
  const turnNumRecord = bigNumberify(eventArgs[1]).toNumber();
  const finalizesAt = bigNumberify(eventArgs[2]).toHexString();
  const challenger = eventArgs[3];
  const isFinal = eventArgs[4];
  const chainId = bigNumberify(eventArgs[5][0]).toHexString();
  const participants = eventArgs[5][1].map(p => bigNumberify(p).toHexString());
  const channelNonce = bigNumberify(eventArgs[5][2]).toHexString();
  const appDefinition = eventArgs[5][3];
  const challengeDuration = bigNumberify(eventArgs[5][4]).toNumber();

  const variableParts: VariablePart[] = eventArgs[6].map((e, i) => {
    const outcome = eventArgs[6][i][0];
    const appData = eventArgs[6][i][1];
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
