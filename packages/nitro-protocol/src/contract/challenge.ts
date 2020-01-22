import {utils} from 'ethers';
import {decodeOutcome} from './outcome';
import {FixedPart, hashState, State, VariablePart} from './state';
import {Address, Bytes32, Uint256, Uint8} from './types';
import {Channel, SignedState} from '..';

export function hashChallengeMessage(challengeState: State): Bytes32 {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(['bytes32', 'string'], [hashState(challengeState), 'forceMove'])
  );
}

export interface ChallengeRegisteredEvent {
  challengerAddress: string;
  finalizesAt: string;
  challengeStates: SignedState[];
}
export interface ChallengeRegisteredStruct {
  channelId: Bytes32;
  turnNumRecord: Uint256;
  finalizesAt: Uint256;
  challenger: Address;
  isFinal: boolean;
  fixedPart: FixedPart;
  variableParts: VariablePart[];
  sigs: utils.Signature[];
  whoSignedWhat: Uint8[];
}
export function getChallengeRegisteredEvent(eventResult): ChallengeRegisteredEvent {
  const {
    turnNumRecord,
    finalizesAt,
    challenger,
    isFinal,
    fixedPart,
    variableParts: variablePartsUnstructured,
    sigs,
    whoSignedWhat,
  }: ChallengeRegisteredStruct = eventResult.slice(-1)[0].args;

  // Fixed part
  const chainId = utils.bigNumberify(fixedPart[0]).toHexString();
  const participants = fixedPart[1].map(p => utils.bigNumberify(p).toHexString());
  const channelNonce = utils.bigNumberify(fixedPart[2]).toHexString();
  const appDefinition = fixedPart[3];
  const challengeDuration = utils.bigNumberify(fixedPart[4]).toNumber();

  // Variable part
  const variableParts: VariablePart[] = variablePartsUnstructured.map(v => {
    const outcome = v[0];
    const appData = v[1];
    return {outcome, appData};
  });

  const channel: Channel = {chainId, channelNonce, participants};
  const challengeStates: SignedState[] = variableParts.map((v, i) => {
    const turnNum = utils.bigNumberify(turnNumRecord).sub(variableParts.length - i - 1);
    const signature = sigs[i];
    const state: State = {
      turnNum: turnNum.toNumber(), // TODO: this is unsafe is uin256 is > 53 bits
      channel,
      outcome: decodeOutcome(v.outcome),
      appData: v.appData,
      challengeDuration,
      appDefinition,
      isFinal,
    };
    return {state, signature};
  });
  return {challengeStates, finalizesAt, challengerAddress: challenger};
}
