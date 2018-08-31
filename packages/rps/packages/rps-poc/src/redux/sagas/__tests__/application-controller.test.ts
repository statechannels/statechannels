import GameEngineA from '../../../game-engine/GameEngineA';
import { expectSaga } from 'redux-saga-test-plan';
import * as PlayerAState from '../../../game-engine/application-states/PlayerA';
import { Channel } from 'fmg-core';
import applicationControllerSaga from '../application-controller';
import { GameAction } from '../../actions/game';
import { MessageAction } from '../../actions/messages';
import { Wallet, WalletFundingAction } from '../../../wallet';
import { PostFundSetup  } from '../../../game-engine/positions';
import Move from '../../../game-engine/Move';

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
  const channel = new Channel('fakeGameLibraryAddress', 456, ['0xa', '0xb']);
  const position = new PostFundSetup(channel, 0, balances, 0, stake);

  const mockEngine = jest.spyOn(GameEngineA, 'setupGame');

  it('should set up the game engine when an opponent is chosen', async () => {
    await expectSaga(applicationControllerSaga, wallet)
      .dispatch(GameAction.chooseOpponent(opponent, stake))
      .silentRun();
    expect(mockEngine).toHaveBeenCalledWith({ me: address, opponent, stake, balances });
  });

  it('should send a message when isReadyToSend is true', () => {
    const testChannel = new Channel('fake', 456, [address, opponent]);

    const testState = new PlayerAState.ReadyToSendPreFundSetupA({
      channel: testChannel,
      stake,
      balances,
      position,
    });

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
      .put(GameAction.moveSent(new Move(testState.position.toHex(), 'fakesig')))
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
