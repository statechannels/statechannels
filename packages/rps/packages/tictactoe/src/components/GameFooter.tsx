import React from "react";
import { Button } from 'reactstrap';
import { Result, Imperative } from '../core/results';
import Navbar from "reactstrap/lib/Navbar";

interface Props {
  createBlockchainChallenge: () => void;
  resign: () => void;
  isNotOurTurn: boolean;
  canChallenge: boolean;
  challengeOngoing: boolean;
  result: Result | Imperative;
}

export default class GameFooter extends React.PureComponent<Props> {
  renderResignButton(resign, isNotOurTurn){
    return (
      <Button className="footer-resign navbar-button mr-auto" outline={true} onClick={resign} disabled={isNotOurTurn}>
      {isNotOurTurn ? "Can't Resign" : "Resign"}
      </Button>
    );
  }
  renderChallengeButton( createBlockchainChallenge, canChallenge){
    return (
      <Button className="footer-challenge navbar-button ml-auto" outline={true} onClick={createBlockchainChallenge} disabled={!canChallenge}>
      {canChallenge ? "Challenge" : "Can't challenge"}
      </Button>
    );
  }
  renderResultAndButtons(result: Result | Imperative, resign, createBlockchainChallenge, isNotOurTurn, canChallenge) {
    if (result === Result.YouWin) {
      return (
        <Navbar id="you-win" className="navbar fixed-bottom footer-bar">
          {this.renderResignButton(resign, isNotOurTurn)}
          <span>You Win!</span>
          {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
        </Navbar>
      );
    }
    if (result === Result.YouLose) {
      return (
        <Navbar id="you-lose" className="navbar fixed-bottom footer-bar">
          {this.renderResignButton(resign, isNotOurTurn)}
          <span>You Lose!</span>
          {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
        </Navbar>
      );
    }
    if (result === Result.Tie) {
      return (
        <Navbar id="tie" className="navbar fixed-bottom footer-bar">
          {this.renderResignButton(resign, isNotOurTurn)}
          <span>It's a Draw!</span>
          {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
        </Navbar>
      );
    }
    if (result === Imperative.Choose) {
      return (
        <Navbar id="choose" className="navbar fixed-bottom footer-bar">
        {this.renderResignButton(resign, isNotOurTurn)}
        <span>Choose your move</span>
        {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
      </Navbar>
      );
    }
    if (result === Imperative.Wait) {
      return (
        <Navbar id="wait" className="navbar fixed-bottom footer-bar">
          {this.renderResignButton(resign, isNotOurTurn)}
          <span>Wait for Opponent's move!</span>
          {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
        </Navbar>
      );
    } else { return <span>&nbsp;</span>; }
  }
  render() {
    const { resign, createBlockchainChallenge, isNotOurTurn, canChallenge, result } = this.props;

    return (
      this.renderResultAndButtons(result, resign, createBlockchainChallenge, isNotOurTurn, canChallenge)
    );
  }
}
