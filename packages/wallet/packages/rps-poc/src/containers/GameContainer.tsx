import React from 'react';
import { connect } from 'react-redux';

import { Move } from '../core';
import { SiteState } from '../redux/reducer';
import * as gameActions from '../redux/game/actions';

import { WalletController } from '../wallet';
import * as walletActions from '../wallet/redux/actions/external';
import WalletHeader from '../wallet/containers/WalletFooter';
import WaitingRoomPage from '../components/WaitingRoomPage';
import ConfirmGamePage from '../components/ConfirmGamePage';
import FundingConfirmedPage from '../components/FundingConfirmedPage'; // WaitForPostFundSetup
import SelectMovePage from '../components/SelectMovePage';
import WaitForOpponentToPickMove from '../components/WaitForOpponentToPickMove';
import MoveSelectedPage from '../components/MoveSelectedPage'; // WaitForReveal, WaitForResting
import ResultPage from '../components/ResultPage'; // PlayAgain
import InsufficientFunds from '../components/InsufficientFunds';
import WaitToResign from '../components/WaitToResign';
import WaitForResignationAcknowledgement from '../components/WaitForResignationAcknowledgement';
import GameOverPage from '../components/GameOverPage'; // GameOver, OpponentResigned
import GameProposedPage from '../components/GameProposedPage';

import WaitForWallet from '../components/WaitForWallet'; // WaitForFunding, maybe others?

import { GameState, StateName } from '../redux/game/state';

interface GameProps {
  state: GameState;
  showWallet: boolean;
  showWalletHeader: boolean;
  chooseMove: (move: Move) => void;
  playAgain: () => void;
  createBlockchainChallenge: () => void;
  confirmGame: () => void;
  declineGame: () => void;
  createOpenGame: (roundBuyIn: string) => void;
  cancelOpenGame: () => void;
  resign: () => void;
  withdraw: () => void;
}

function GameContainer(props: GameProps) {

  if (props.showWalletHeader) {
    return <WalletHeader>{RenderGame(props)}</WalletHeader>;
  } else {
    return <WalletController>{RenderGame(props)} </WalletController>;
  }

}

function RenderGame(props: GameProps) {
  const { state, chooseMove, playAgain, resign, createBlockchainChallenge, confirmGame, declineGame, withdraw } = props;
  switch (state.name) {
    case StateName.WaitingRoom:
      return (
        <WaitingRoomPage
          cancelOpenGame={props.cancelOpenGame}
          roundBuyIn={state.roundBuyIn}
        />
      );

    case StateName.WaitForGameConfirmationA:
      return <GameProposedPage message='Waiting for opponent to confirm' />;
    case StateName.ConfirmGameB:
      return <ConfirmGamePage confirmGame={confirmGame} cancelGame={declineGame} stake={state.roundBuyIn} opponentName={state.opponentName} />;
    case StateName.PickMove:
      return <SelectMovePage chooseMove={chooseMove} resign={resign} />;

    case StateName.WaitForOpponentToPickMoveA:
      return (
        <MoveSelectedPage
          message="Waiting for your opponent to choose their move"
          yourMove={state.myMove}
          createBlockchainChallenge={createBlockchainChallenge}
        />
      );


    case StateName.GameOver:
    // TODO: We probably want a seperate message for when your opponent resigns
    case StateName.OpponentResigned:
      return <GameOverPage visible={state.name === StateName.OpponentResigned || state.name === StateName.GameOver}  withdraw={withdraw} />;
    case StateName.WaitForPostFundSetup:
      return <FundingConfirmedPage message="Waiting for your opponent to acknowledge" />;

    case StateName.WaitForOpponentToPickMoveB:
      return <WaitForOpponentToPickMove />;

    case StateName.WaitForRevealB:
      return (
        <MoveSelectedPage
          message="Waiting for your opponent to choose their move"
          yourMove={state.myMove}
          createBlockchainChallenge={createBlockchainChallenge}
        />
      );

    case StateName.PlayAgain:
      return (
        <ResultPage
          message="Waiting for opponent to suggest a new game"
          yourMove={state.myMove}
          theirMove={state.theirMove}
          result={state.result}
          playAgain={playAgain}
          resign={resign}
        />
      );


    case StateName.WaitForRestingA:
      return (
        <ResultPage
          message="Waiting for opponent to confirm"
          yourMove={state.myMove}
          theirMove={state.theirMove}
          result={state.result}
          playAgain={playAgain}
          resign={resign}
        />
      );
    case StateName.InsufficientFunds:
      return <InsufficientFunds />;
    case StateName.WaitToResign:
      return <WaitToResign />;
    case StateName.WaitForResignationAcknowledgement:
      return <WaitForResignationAcknowledgement />;
    case StateName.WaitForFunding:
      return <WaitForWallet reason={"Waiting for funding confirmation."} />;
    case StateName.WaitForWithdrawal:
      return <WaitForWallet reason={"Waiting for funds withdrawal."} />;
    default:
      throw new Error(`View not created for ${state.name}`);
  }
}

const mapStateToProps = (state: SiteState) => ({
  state: state.game.gameState,
  showWallet: state.wallet.display.showWallet,
  showWalletHeader: state.wallet.display.showHeader,
});

const mapDispatchToProps = {
  chooseMove: gameActions.chooseMove,
  playAgain: gameActions.playAgain,
  createBlockchainChallenge: walletActions.createChallenge,
  confirmGame: gameActions.confirmGame,
  declineGame: gameActions.declineGame,
  createOpenGame: gameActions.createOpenGame,
  cancelOpenGame: gameActions.cancelOpenGame,
  resign: gameActions.resign,
  withdraw: gameActions.withdrawalRequest,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameContainer);
