import React, { Fragment } from 'react';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';

import { Marker } from '../core';
import GameScreen from '../components/GameScreen';
import ProfileContainer from './ProfileContainer';
import WaitingRoomPage from '../components/WaitingRoomPage';
import ConfirmGamePage from '../components/ConfirmGamePage';
import GameProposedPage from '../components/GameProposedPage';
import PlayAgain from '../components/PlayAgain';
import PlayAgainWait from '../components/PlayAgainWait';
import InsufficientFunds from '../components/InsufficientFunds';
import WaitToResign from '../components/WaitToResign';
import WaitForResignationAcknowledgement from '../components/WaitForResignationAcknowledgement';
import GameOverPage from '../components/GameOverPage';

import { Marks } from '../core';
import { GameState, StateName } from '../redux/game/state';
import * as actions from '../redux/game/actions';

interface GameProps {
  state: GameState;
  marksMade: (marks: Marks) => void;
  cancelOpenGame: () => void;
  confirmGame: () => void;
  declineGame: () => void;
  playAgain: () => void;
  resign: () => void;
  // withdraw: () => void;
  exitToLobby: () => void;
}

function GameContainer(props: GameProps) {
  return (
    <Fragment>
      {RenderGame(props)}

      {/* <Wallet /> */}
    </Fragment>
  );
}

function RenderGame(props: GameProps) {
  const { state, marksMade, confirmGame, declineGame, playAgain, resign, exitToLobby } = props;
  switch (state.name) {
    case StateName.NoName:
      return <ProfileContainer />;
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
    // case StateName.WaitForFunding:
    //   return <WaitForWallet reason={"Waiting for funding confirmation."} />;
    case StateName.XsPickMove:
      return (
        <GameScreen
          noughts={state.noughts}
          crosses={state.crosses}
          you={Marker.crosses} // fixed by StateName
          player={state.player}
          result={state.result}
          onScreenBalances={state.onScreenBalances} 
          // onScreenBalances={state.balances} // display enforceable outcome
          marksMade={marksMade}
          resign={resign}
        />
      );
    case StateName.XsWaitForOpponentToPickMove:
      return (
        <GameScreen
          noughts={state.noughts}
          crosses={state.crosses}
          you={Marker.crosses} // fixed by StateName
          player={state.player}
          result={state.result}
          onScreenBalances={state.onScreenBalances}
          // onScreenBalances={state.balances}
          marksMade={marksMade}
          resign={resign}
        />
      );
    case StateName.OsPickMove:
      return (
        <GameScreen
          noughts={state.noughts}
          crosses={state.crosses}
          you={Marker.noughts} // fixed by StateName
          player={state.player}
          result={state.result}
          onScreenBalances={state.onScreenBalances} 
          // onScreenBalances={state.balances} // display enforceable outcome
          marksMade={marksMade}
          resign={resign}
        />
      );
    case StateName.OsWaitForOpponentToPickMove:
      return (
        <GameScreen
          noughts={state.noughts}
          crosses={state.crosses}
          you={Marker.noughts} // fixed by StateName
          player={state.player}
          result={state.result}
          onScreenBalances={state.onScreenBalances}
          // onScreenBalances={state.balances}
          marksMade={marksMade}
          resign={resign}
        />
      );
    case StateName.PlayAgain:
        return (
        <PlayAgain
        noughts={state.noughts}
        crosses={state.crosses}
        you={state.you} 
        player={state.player}
        result={state.result}
          onScreenBalances={state.onScreenBalances}
          // onScreenBalances={state.balances}
        marksMade={marksMade}
        playAgain={playAgain}
        resign={resign}
        />
        );
      case StateName.WaitForResting:
        return (
        <PlayAgainWait
        noughts={state.noughts}
        crosses={state.crosses}
        you={state.you} 
        player={state.player}
        result={state.result}
          onScreenBalances={state.onScreenBalances}
          // onScreenBalances={state.balances}
        marksMade={marksMade}
        playAgain={playAgain}
        resign={resign}
        />
        );
      case StateName.InsufficientFunds:
      return (
        <InsufficientFunds
      noughts={state.noughts}
      crosses={state.crosses}
      you={state.you}
      player={state.player}
      result={state.result}
      onScreenBalances={state.onScreenBalances}
      marksMade={marksMade}
      />
      );
    case StateName.WaitToResign:
      return <WaitToResign />;
    case StateName.WaitForResignationAcknowledgement:
      return <WaitForResignationAcknowledgement />;
    case StateName.GameOver:
    case StateName.OpponentResigned:
      return <GameOverPage visible={(state.name === StateName.OpponentResigned) || (state.name === StateName.GameOver)} exitToLobby={exitToLobby} />;
    default:
      throw new Error(`View not created for ${state.name}`);
  }
}

const mapStateToProps = (state: SiteState) => ({
  state: state.game.gameState,
});

const mapDispatchToProps = {
  marksMade: actions.marksMade,
  cancelOpenGame: actions.cancelOpenGame,
  confirmGame: actions.confirmGame,
  declineGame: actions.declineGame,
  playAgain: actions.playAgain,
  resign: actions.resign,
  exitToLobby: actions.exitToLobby,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameContainer);
