import { Reducer } from 'redux';
import { GameActionType } from '../actions/game';
import { Channel } from 'fmg-core';
import * as playerA from '../../game-engine/application-states/PlayerA';
import Message from '../../game-engine/Message';
import { State as ApplicationState } from '../../game-engine/application-states';

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
const message = new Message('blah', 'sig');

type GameState = ApplicationState | undefined;

// todo: rewrite this to use the gameEngine and return actual data
export const gameReducer: Reducer<GameState> = (state, action) => {

  switch (action.type) {
    case  GameActionType.CHOOSE_OPPONENT:
      return new playerA.ReadyToSendPreFundSetupA({ ...coreProps, message });

    case  GameActionType.CHOOSE_A_PLAY:
      return new playerA.ReadyToSendPropose({
        ...coreProps,
        adjudicator,
        aPlay,
        salt,
        message,
      });

    case  GameActionType.MESSAGE_SENT:
      switch (state.constructor) {
        case playerA.ReadyToSendPreFundSetupA:
          return new playerA.WaitForPreFundSetupB({ ...coreProps, message });
        case playerA.ReadyToSendPostFundSetupA:
          return new playerA.WaitForPostFundSetupB({
            ...coreProps,
            adjudicator,
            message,
          });
        case playerA.ReadyToSendPropose:
          return new playerA.WaitForAccept({
            ...coreProps,
            adjudicator,
            aPlay,
            salt,
            message,
          });
        case playerA.ReadyToSendReveal:
          const result = 'win';
          return new playerA.WaitForResting({
            ...coreProps,
            adjudicator,
            aPlay,
            bPlay,
            result,
            salt,
            message,
          });
        default:
          return state;
      }
      break;

    case  GameActionType.MESSAGE_RECEIVED:
      switch (state.constructor) {
        case playerA.WaitForPreFundSetupB:
          return new playerA.WaitForBlockchainDeploy({ ...coreProps });
        case playerA.WaitForPostFundSetupB:
          return new playerA.ReadyToChooseAPlay({ ...coreProps, adjudicator, turnNum: 3 });
        case playerA.WaitForAccept:
          const result = 'win';
          return new playerA.ReadyToSendReveal({
            ...coreProps,
            adjudicator,
            aPlay,
            bPlay,
            result,
            salt,
            message,
          });
        default:
          return state;
      }
      break;

    case  GameActionType.EVENT_RECEIVED:
      switch (state.constructor) {
        case playerA.WaitForBlockchainDeploy:
          return new playerA.WaitForBToDeposit({ ...coreProps, adjudicator });
        case playerA.WaitForBToDeposit:
          return new playerA.ReadyToSendPostFundSetupA({
            ...coreProps,
            adjudicator,
            message,
          });
        default:
          return state;
      }
      break;

    default:
      return state;
  }
}
