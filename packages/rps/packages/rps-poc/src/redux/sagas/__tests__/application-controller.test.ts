import GameEngineA from '../../../game-engine/GameEngineA';
import { expectSaga } from 'redux-saga-test-plan';
import * as PlayerAState from '../../../game-engine/application-states/PlayerA';
import Move from '../../../game-engine/Move';
import { Channel } from 'fmg-core';
import applicationControllerSaga from '../application-controller';
import { GameAction } from '../../actions/game';
import { MessageAction } from '../../actions/messages';
import { Wallet, WalletFundingAction } from '../../../wallet';

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

  const mockEngine = jest.spyOn(GameEngineA, 'setupGame');
  it('should set up the game engine when an opponent is chosen', async () => {
    await expectSaga(applicationControllerSaga, wallet)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .silentRun();
    expect(mockEngine).toHaveBeenCalledWith({ opponent, stake, balances, wallet });
  });

  it('should send a message when isReadyToSend is true', () => {
    const testChannel = new Channel('fake', 456, [address, opponent]);

    const testState = new PlayerAState.ReadyToSendPreFundSetupA({
      channel: testChannel,
      stake,
      balances,
      move: new Move('', ''),
    });

    mockEngine.mockImplementation(() => {
      return {
        state: testState,
        moveSent: () => {
          return;
        },
      };
    });

    return expectSaga(applicationControllerSaga, wallet)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .put(MessageAction.sendMessage(opponent, testState.move.toHex()))
      .put(GameAction.moveSent(testState.move))
      .put(GameAction.stateChanged(testState))
      .silentRun();
  });

  it('should send funding when the state isReadyForFunding', () => {
    const testChannel = new Channel('fake', 456, [address, opponent]);

    const testState = new PlayerAState.ReadyToFund({
      channel: testChannel,
      stake,
      balances,
    });

    mockEngine.mockImplementation(() => {
      return {
        state: testState,
        moveSent: () => {
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
