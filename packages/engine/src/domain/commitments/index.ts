import {Commitment as C, CommitmentType as CT} from "fmg-core";
import {signCommitment as signCommitmentUtil} from "../signing-utils";
import {convertCommitmentToSignedState, convertCommitmentToState} from "../../utils/nitro-converter";
import {SignedState, Signatures, getChannelId} from "@statechannels/nitro-protocol";

export type Commitment = C;
export const CommitmentType = CT;
export type CommitmentType = CT;

export interface SignedCommitment {
  commitment: Commitment;
  signature: string;
  // TODO: Eventually SignedCommitment will be replaced with SignedState
  signedState: SignedState;
}

// -------
// Helpers
// -------

// temporary name while we remove the old signCommitment method
export function signCommitment2(commitment: Commitment, privateKey: string): SignedCommitment {
  const signedState = convertCommitmentToSignedState(commitment, privateKey);
  return {commitment, signature: signCommitmentUtil(commitment, privateKey), signedState};
}

export function hasValidSignature(signedState: SignedState): boolean {
  const signerAddress = Signatures.getStateSignerAddress(signedState);
  const {state} = signedState;
  const {participants} = state.channel;
  return participants.indexOf(signerAddress) === state.turnNum % participants.length;
}

export function getCommitmentChannelId(commitment: Commitment): string {
  // Return the nitro protocol channel Id to keep storage consistent
  return getChannelId(convertCommitmentToState(commitment).channel);
}

function incrementTurnNum(commitment: Commitment): Commitment {
  return {...commitment, turnNum: commitment.turnNum + 1};
}

export function constructConclude(commitment: Commitment): Commitment {
  return {...incrementTurnNum(commitment), commitmentType: CommitmentType.Conclude};
}

export function nextSetupCommitment(commitment: Commitment): Commitment | "NotASetupCommitment" {
  const turnNum = commitment.turnNum + 1;
  const numParticipants = commitment.channel.participants.length;
  let commitmentType;
  let commitmentCount;
  if (turnNum <= numParticipants - 1) {
    commitmentType = CommitmentType.PreFundSetup;
    commitmentCount = turnNum;
  } else if (turnNum <= 2 * numParticipants - 1) {
    commitmentType = CommitmentType.PostFundSetup;
    commitmentCount = turnNum - numParticipants;
  } else {
    return "NotASetupCommitment";
  }

  return {...commitment, turnNum, commitmentType, commitmentCount};
}
