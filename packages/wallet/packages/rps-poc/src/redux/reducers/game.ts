import { GameTypes } from '../actions/game';
import { Channel } from 'fmg-core';
import * as playerA from '../../game-engine/application-states/PlayerA';

// Fake data for development purposes
const gameLibrary = 0x111;
const channelNonce = 15;
const participantA = 0xa;
const participantB = 0xb;
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stake = 1;
const aBal = 4;
const bBal = 5;
const balances = [aBal, bBal];
const coreProps = { channel, stake, balances };
const adjudicator = 0xc;
const aPlay = 'rock';
const bPlay = 'scissors';
const salt = 'abc123';

// todo: rewrite this to use the gameEngine and return actual data
export default function gameReducer(state = {}, action = {}) {
  let signedPreFundSetupAMessage;
  let signedProposeMessage;

  switch (action.type) {
    case types.CHOOSE_OPPONENT:
      signedPreFundSetupAMessage = 'blah';
      return new playerA.ReadyToSendPreFundSetupA({ ...coreProps, signedPreFundSetupAMessage });

    case types.CHOOSE_A_PLAY:
      signedProposeMessage = 'blah';
      return new playerA.ReadyToSendPropose({
        ...coreProps,
        adjudicator,
        aPlay,
        salt,
        signedProposeMessage,
      });

    case types.MESSAGE_SENT:
      switch (state.type) {
        case playerA.ReadyToSendPreFundSetupA:
          signedPreFundSetupAMessage = 'blah';
          return new playerA.WaitForPreFundSetupB({ ...coreProps, signedPreFundSetupAMessage });
        case playerA.ReadyToSendPostFundSetupA:
          const signedPostFundSetupAMessage = 'blah';
          return new playerA.WaitForPostFundSetupB({
            ...coreProps,
            adjudicator,
            signedPostFundSetupAMessage,
          });
        case playerA.ReadyToSendPropose:
          signedProposeMessage = 'blah';
          return new playerA.WaitForAccept({
            ...coreProps,
            adjudicator,
            aPlay,
            salt,
            signedProposeMessage,
          });
        case playerA.ReadyToSendReveal:
          const signedRevealMessage = 'blah';
          const result = 'win';
          return new playerA.WaitForResting({
            ...coreProps,
            adjudicator,
            aPlay,
            bPlay,
            result,
            salt,
            signedRevealMessage,
          });
        default:
      }
      break;

    case types.MESSAGE_RECEIVED:
      switch (state.type) {
        case playerA.WaitForPreFundSetupB:
          const deploymentTransaction = 'blah';
          return new playerA.WaitForBlockchainDeploy({ ...coreProps, deploymentTransaction });
        case playerA.WaitForPostFundSetupB:
          return new playerA.ReadyToChooseAPlay({ ...coreProps, adjudicator });
        case playerA.WaitForAccept:
          const signedRevealMessage = 'blah';
          const result = 'win';
          return new playerA.ReadyToSendReveal({
            ...coreProps,
            adjudicator,
            aPlay,
            bPlay,
            result,
            salt,
            signedRevealMessage,
          });
        default:
      }
      break;

    case types.EVENT_RECEIVED:
      switch (state.type) {
        case playerA.WaitForBlockchainDeploy:
          return new playerA.WaitForBToDeposit({ ...coreProps, adjudicator });
        case playerA.WaitForBToDeposit:
          const signedPostFundSetupAMessage = 'blah';
          return new playerA.ReadyToSendPostFundSetupA({
            ...coreProps,
            adjudicator,
            signedPostFundSetupAMessage,
          });
        default:
      }
      break;

    default:
      return state;
  }
}
