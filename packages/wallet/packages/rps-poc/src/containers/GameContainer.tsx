import React from 'react';
import { connect } from 'react-redux';

import * as gameActions from '../redux/game/actions';
import * as walletActions from '../wallet/redux/actions/external';

import WaitingStep from '../components/WaitingStep';
import SelectPlayPage from '../components/SelectPlayPage';
import GameProposedPage from '../components/GameProposedPage';
import FundingConfirmedPage from '../components/FundingConfirmedPage';
import PlaySelectedPage from '../components/PlaySelectedPage';
import ResultPage from '../components/ResultPage';
import { WalletController } from '../wallet';

import { SiteState } from '../redux/reducer';

import { PlayerAStateType as playerA } from '../game-engine/application-states/PlayerA';
import { PlayerBStateType as playerB } from '../game-engine/application-states/PlayerB';

import { State as GameState } from '../game-engine/application-states';
import { Play } from '../game-engine/positions';
import WalletHeader from 'src/wallet/containers/WalletHeader';

interface GameProps {
  state: GameState;
  showWallet: boolean;
  showWalletHeader: boolean;
  choosePlay: (play: Play) => void;
  abandonGame: () => void;
  playAgain: () => void;
  createBlockchainChallenge: () => void;
}

function GameContainer(props: GameProps) {

  if (props.showWallet) {
    return <WalletController/>;
  }
  else if (props.showWalletHeader){
    return <WalletHeader>{RenderGame(props)}</WalletHeader>;
  }else{
    return RenderGame(props);
  }
  
}
function RenderGame(props:GameProps){
  const { state, choosePlay, playAgain, abandonGame, createBlockchainChallenge } = props;
  switch (state.type) {
    case playerA.WAIT_FOR_PRE_FUND_SETUP:
      return <GameProposedPage message="Waiting for your opponent to accept game" />;
    case playerA.WAIT_FOR_POST_FUND_SETUP:
      return <FundingConfirmedPage message="Waiting for your opponent to acknowledge" />;

    case playerA.CHOOSE_PLAY:
      return <SelectPlayPage choosePlay={choosePlay} abandonGame={abandonGame} />;

    case playerA.WAIT_FOR_ACCEPT:
      return (
        <PlaySelectedPage
          message="Waiting for your opponent to choose their move"
          yourPlay={state.aPlay}
          createBlockchainChallenge={createBlockchainChallenge}
        />
      );

    case playerA.WAIT_FOR_RESTING:
      return (
        <ResultPage
          message="Waiting for resting"
          yourPlay={state.aPlay}
          theirPlay={state.bPlay}
          result={state.result}
          playAgain={playAgain}
          abandonGame={abandonGame}
        />
      );

    case playerA.INSUFFICIENT_FUNDS:
    case playerB.INSUFFICIENT_FUNDS:
      // todo: add into the logic about who it was that ran out of funds
      // Also todo: replace with new component (WaitingStep is just a filler)
      return (
        <WaitingStep createBlockchainChallenge={createBlockchainChallenge} message="About to conclude the game – either you or your opponent has run out of funds!" />
      );

    case playerA.WAIT_FOR_CONCLUDE:
    case playerB.WAIT_FOR_CONCLUDE:
    case playerA.CONCLUDED:
    case playerB.CONCLUDED:
    case playerA.CONCLUDE_RECEIVED:
    case playerB.CONCLUDE_RECEIVED:
      return <WalletController />;
    case playerB.WAIT_FOR_POST_FUND_SETUP:
      return <FundingConfirmedPage message="Waiting for your opponent to acknowledge" />;

    case playerB.WAIT_FOR_PROPOSE:
      return <WaitingStep createBlockchainChallenge={createBlockchainChallenge} message="Waiting for your opponent to choose their move" />;

    case playerB.CHOOSE_PLAY:
      return <SelectPlayPage choosePlay={choosePlay} abandonGame={abandonGame} />;
    case playerB.WAIT_FOR_REVEAL:
      return (
        <PlaySelectedPage
          message="Waiting for your opponent to choose their move"
          yourPlay={state.bPlay}
          createBlockchainChallenge={createBlockchainChallenge}
        />
      );

    case playerB.VIEW_RESULT:
      return (
        <ResultPage
          message="Waiting for opponent to suggest a new game"
          yourPlay={state.bPlay}
          theirPlay={state.aPlay}
          result={state.result}
          playAgain={playAgain}
          abandonGame={abandonGame}
        />
      );
  }
}
const mapStateToProps = (state: SiteState) => ({
  state: state.app.gameState as GameState,
  showWallet: state.wallet.display.showWallet,
  showWalletHeader: state.wallet.display.showHeader,
});

const mapDispatchToProps = {
  choosePlay: gameActions.choosePlay,
  playAgain: gameActions.playAgain,
  abandonGame: gameActions.abandonGame,
  createBlockchainChallenge: walletActions.createChallenge,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameContainer);
