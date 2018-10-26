import React from 'react';
import { mount } from 'enzyme';
import * as scenarios from '../../core/test-scenarios';
import GameContainer from '../GameContainer';
import { waitForGameConfirmationA } from '../../redux/game/state';
import configureStore from 'redux-mock-store';
import GameProposed from '../../components/GameProposedPage';

const { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName } = scenarios.standard;
const base = { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName };
const mockStore = configureStore();


describe('GameContainer', () => {
  // skipping for the time being to avoid having to figure out how to test nested containers
  it('should render GameProposed for state WaitForGameConfirmationA', () => {
    const { preFundSetupA } = scenarios.standard;

    const gameState = waitForGameConfirmationA({ ...base, ...preFundSetupA });

    const initialState = {
      game: { gameState },
      rules: { visible: true },
      login: { user: { displayName: "Tom", }, },
      wallet: {
        display: {
          showWallet: false,
          showWalletHeader: false,
        },
      },
    };
    const store = mockStore(initialState);
    const component = mount(<GameContainer />, { context: { store } });
    expect(component.find(GameProposed)).toHaveLength(1);
  });
});
