import GameEngineA from '../../../game-engine/GameEngineA';
import { expectSaga } from 'redux-saga-test-plan';
import * as PlayerAState from '../../../game-engine/application-states/PlayerA';
import { Channel } from 'fmg-core';
import applicationControllerSaga from '../application-controller';
import { GameAction } from '../../actions/game';
import { MessageAction } from '../../actions/messages';
import { Wallet, WalletFundingAction } from '../../../wallet';
import { PreFundSetupA, PreFundSetupB  } from '../../../game-engine/positions';

describe('Application Controller', () => {
  const address = 'our_address';
  const wallet: Wallet = {
    address,
    privateKey: 'privateKey',
    sign: (stateString: string) => stateString,
  };
  const opponent = 'opp_add';
  const stake = 1;
  const balances = [3 * stake, 3 * stake];
  const channel = new Channel('fakeGameLibraryAddress', 456, [address, opponent]);

  const mockEngine = jest.spyOn(GameEngineA, 'setupGame');

  it('should set up the game engine when an opponent is chosen', async () => {
    await expectSaga(applicationControllerSaga, wallet)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .silentRun();
    expect(mockEngine).toHaveBeenCalledWith({ me: address, opponent, stake, balances });
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

    return expectSaga(applicationControllerSaga, wallet)
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

    return expectSaga(applicationControllerSaga, wallet)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .put(WalletFundingAction.walletFundingRequest(wallet, testState.player))
      .put(GameAction.stateChanged(testState))
      .silentRun();
  });
});
