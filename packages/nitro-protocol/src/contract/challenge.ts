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
  const [event] = eventArgs.slice(-1);

  const turnNumRecord = bigNumberify(event.args.turnNumRecord).toNumber();
  const finalizesAt = bigNumberify(event.args.finalizesAt).toHexString();
  const challenger = event.args.challenger;
  const isFinal = event.args.isFinal;
  // Fixed part
  const chainId = bigNumberify(event.args.fixedPart[0]).toHexString();
  const participants = event.args.fixedPart[1].map(p => bigNumberify(p).toHexString());
  const channelNonce = bigNumberify(event.args.fixedPart[2]).toHexString();
  const appDefinition = event.args.fixedPart[3];
  const challengeDuration = bigNumberify(event.args.fixedPart[4]).toNumber();
  // Variable part
  const variableParts: VariablePart[] = event.args.variableParts.map(v => {
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
