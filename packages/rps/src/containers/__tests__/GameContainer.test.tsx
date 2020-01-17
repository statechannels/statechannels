import React from 'react';
import {mount} from 'enzyme';
import GameContainer from '../GameContainer';
import configureStore from 'redux-mock-store';
import GameProposed from '../../components/GameProposedPage';
import {SiteState} from '../../redux/reducer';
import {localStatesA} from '../../redux/game/__tests__/scenarios';

const mockStore = configureStore();

describe('GameContainer', () => {
  // skipping for the time being to avoid having to figure out how to test nested containers
  it('should render GameProposed for state GameChosen', () => {
    const initialState: SiteState = {
      login: {
        loading: false,
        loggedIn: true,
        user: null,
        error: undefined,
      },
      metamask: {
        loading: false,
        accounts: [],
      },
      wallet: {
        loading: false,
        error: null,
        success: true,
      },
      openGames: [],
      overlay: {
        rulesVisible: false,
        walletVisible: false,
      },
      game: {
        localState: localStatesA.gameChosen,
        channelState: null,
      },
    };
    const store = mockStore(initialState);
    const component = mount(<GameContainer />, {context: {store}});
    expect(component.find(GameProposed)).toHaveLength(1);
  });
});
