import React from 'react';
import {storiesOf} from '@storybook/react';
import SiteContainer from '../containers/SiteContainer';
import {Provider} from 'react-redux';
import * as states from '../redux/game/state';
import '../index.scss';
import {SiteState} from '../redux/reducer';
import HomePage from '../components/HomePage';
import LoadingPage from '../components/LoadingPage';
import LoginErrorPage from '../components/LoginErrorPage';
import {localStatesA, localStatesB, channelStates} from '../redux/game/__tests__/scenarios';
import {ChannelState} from '../core';
import GameBar from '../components/GameBar';
import {bigNumberify, parseEther} from 'ethers/utils';

const fakeStore = state => ({
  dispatch: action => {
    console.log(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => state,
  subscribe: () => () => {
    /* empty */
  },
  replaceReducer: () => {
    /* empty */
  },
});

const testState = state => () => (
  <Provider store={fakeStore(state) as any}>
    <SiteContainer />
  </Provider>
);

const initialState: SiteState = {
  login: {
    loading: false,
    loggedIn: true,
    user: null,
    error: undefined,
  },
  metamask: {
    loading: false,
    network: 0,
    accounts: [],
  },
  wallet: {
    loading: false,
    error: null,
    success: true,
  },
  openGames: [
    {
      address: '0x',
      outcomeAddress: '0xabc',
      name: 'Player B',
      stake: parseEther('1').toString(),
      isPublic: true,
      createdAt: 0,
    },
  ],
  overlay: {
    rulesVisible: false,
    walletVisible: false,
  },
  game: {
    localState: {type: 'Setup.Empty'},
    channelState: null,
  },
};

export function siteStateFromLocalState<T extends states.LocalState>(
  localState: T,
  channelState?: ChannelState
): SiteState {
  if (!channelState) {
    channelState = channelStates.preFund0;
  }
  return {
    ...initialState,
    game: {localState, channelState},
  };
}

storiesOf('Setup', module)
  .add('Loading Page', () => <LoadingPage />)
  .add('Login Error Page', () => <LoginErrorPage error="Login error message" />)
  .add('Home Page', () => (
    <HomePage login={() => alert('login')} metamaskState={initialState.metamask} />
  ))
  .add('Profile Modal', testState(initialState));

Object.keys(localStatesA).forEach(key => {
  storiesOf('Game Screens (A)', module).add(
    key,
    testState(siteStateFromLocalState(localStatesA[key]))
  );
});

Object.keys(localStatesB).forEach(key => {
  storiesOf('Game Screens (B)', module).add(
    key,
    testState(siteStateFromLocalState(localStatesB[key]))
  );
});

const balancesArray = [
  ['5', '5'],
  ['6', '4'],
  ['4', '6'],
  ['0.2', '0.8'],
]; // denominated in ETH
balancesArray.forEach(balances => {
  const balancesWei = balances.map(balance => parseEther(balance).toString()); // now in Wei
  storiesOf('GameBar', module).add(balances[0] + ' ETH , ' + balances[1] + ' ETH', () => (
    <div className="w-100">
      <GameBar
        myName={'Michael'}
        opponentName={'Janet'}
        myBalance={balancesWei[0]}
        opponentBalance={balancesWei[1]}
        roundBuyIn={bigNumberify(balancesWei[0])
          .add(bigNumberify(balancesWei[1]))
          .div('10')
          .toString()}
      />
    </div>
  ));
});

storiesOf('Game Over', module);
