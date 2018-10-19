import { State } from "fmg-core";

import { ChallengeResponse } from "../../domain/ChallengeResponse";
import { ChallengeStatus } from "../../domain/ChallengeStatus";
import { ConclusionProof } from "../../domain/ConclusionProof";
import { Signature } from "../../domain/Signature";

export const SET_CHALLENGE = 'CHALLENGE.SET_CHALLENGE';
export const SEND_CHALLENGE_POSITION = 'CHALLENGE.POSITION.SEND';
export const SET_CHALLENGE_STATUS = 'CHALLENGE.SET_CHALLENGE_STATUS';
export const CLEAR_CHALLENGE = 'CHALLENGE.CLEAR_CHALLENGE';

export const RESPOND_WITH_MOVE = "CHALLENGE.RESPONSE.RESPOND_WITH_MOVE";
export const RESPOND_WITH_EXISTING_MOVE = "CHALLENGE.RESPONSE.RESPOND_WITH_EXISTING_MOVE";
export const RESPOND_WITH_ALTERNATIVE_MOVE = "CHALLENGE.RESPONSE.RESPOND_WITH_ALTERNATIVE_MOVE";
export const REFUTE = "CHALLENGE.RESPONSE.REFUTE";
export const CONCLUDE = "CHALLENGE.RESPONSE.CONCLUDE";

export const RESPONSE_ACTIONS = [
  RESPOND_WITH_MOVE,
  RESPOND_WITH_EXISTING_MOVE,
  RESPOND_WITH_ALTERNATIVE_MOVE,
  REFUTE,
  CONCLUDE,
];

export const setChallenge = (expirationTime, responseOptions: ChallengeResponse[], status: ChallengeStatus, ) => ({
  type: SET_CHALLENGE as typeof SET_CHALLENGE,
  expirationTime,
  responseOptions,
  status,
});
export const setChallengeStatus = (status: ChallengeStatus) => ({
  type: SET_CHALLENGE_STATUS as typeof SET_CHALLENGE_STATUS,
  status,
});

export const sendChallengePosition = (position: State) => ({
  type: SEND_CHALLENGE_POSITION as typeof SEND_CHALLENGE_POSITION,
  position,
});

export const clearChallenge = () => ({
  type: CLEAR_CHALLENGE as typeof CLEAR_CHALLENGE,
});

export const respondWithMove = () => ({
  type: RESPOND_WITH_MOVE as typeof RESPOND_WITH_MOVE,
});

export const respondWithExistingMove = (response: string, signature: Signature) => ({
  type: RESPOND_WITH_EXISTING_MOVE as typeof RESPOND_WITH_EXISTING_MOVE,
  response,
  signature,
});

export const respondWithAlternativeMove = (alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature) => ({
  type: RESPOND_WITH_ALTERNATIVE_MOVE as typeof RESPOND_WITH_ALTERNATIVE_MOVE,
  alternativePosition,
  alternativeSignature,
  response,
  responseSignature,
});

export const refute = (newerPosition: string, signature: Signature) => ({
  type: REFUTE as typeof REFUTE,
  newerPosition,
  signature,
});

export const conclude = (proof: ConclusionProof) => ({
  type: CONCLUDE as typeof CONCLUDE,
  proof,
});

export type SetChallenge = ReturnType<typeof setChallenge>;
export type SendChallengePosition = ReturnType<typeof sendChallengePosition>;
export type ClearChallenge = ReturnType<typeof clearChallenge>;
export type SetChallengeStatus = ReturnType<typeof setChallengeStatus>;

export type RespondWithMove = ReturnType<typeof respondWithMove>;
export type RespondWithExistingMove = ReturnType<typeof respondWithExistingMove>;
export type RespondWithAlternativeMove = ReturnType<typeof respondWithAlternativeMove>;
export type Refute = ReturnType<typeof refute>;
export type Conclude = ReturnType<typeof conclude>;

export type ResponseAction = RespondWithMove | RespondWithExistingMove | RespondWithAlternativeMove | Refute | Conclude;