import GameEngineA from '../../../game-engine/GameEngineA';
import { expectSaga } from 'redux-saga-test-plan';
import * as PlayerAState from '../../../game-engine/application-states/PlayerA';
import { Channel } from 'fmg-core';
import applicationControllerSaga from '../application-controller';
import { GameAction } from '../../actions/game';
import { MessageAction } from '../../actions/messages';
import { actions as walletActions } from '../../../wallet';
import { PreFundSetupA, PreFundSetupB  } from '../../../game-engine/positions';

describe('Application Controller', () => {
  const me = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
  const opponent = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
  const stake = 1;
  const balances = [3 * stake, 3 * stake];
  const gameLibrary = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
  const channel = new Channel(gameLibrary, 456, [me, opponent]);

  const mockEngine = jest.spyOn(GameEngineA, 'setupGame');

  it('should set up the game engine when an opponent is chosen', async () => {
    await expectSaga(applicationControllerSaga, me)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .silentRun();
    expect(mockEngine).toHaveBeenCalledWith({ me, opponent, stake, balances });
  });

  it('should send a message when the state is WaitForPreFundSetup (for example)', () => {
    const position = new PreFundSetupA(channel, 0, balances, 0, stake);
    const testState = new PlayerAState.WaitForPreFundSetup({ position });

    mockEngine.mockImplementation(() => {
      return {
        state: testState,
        positionSent: () => {
          return;
        },
      };
    });

    return expectSaga(applicationControllerSaga, me)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .put(MessageAction.sendMessage(opponent, testState.position.toHex()))
      .put(GameAction.stateChanged(testState))
      .silentRun();
  });

  it('should send funding when the state is WaitForFunding', () => {
    const position = new PreFundSetupB(channel, 0, balances, 0, stake);
    const testState = new PlayerAState.WaitForFunding({ position });

    mockEngine.mockImplementation(() => {
      return {
        state: testState,
        positionSent: () => {
          return;
        },
        fundingRequested: () => {
          return;
        },
      };
    });

    return expectSaga(applicationControllerSaga, me)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .put(walletActions.fundingRequest(testState.channelId))
      .put(GameAction.stateChanged(testState))
      .silentRun();
  });
});
