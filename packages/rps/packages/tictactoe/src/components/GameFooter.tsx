import React from "react";
import { Button } from 'reactstrap';
import { Result, Imperative } from '../core/results';
import Navbar from "reactstrap/lib/Navbar";
import { YourMarker, TheirMarker } from './Marker';
import { Marker } from '../core';
import hexToBN from "../utils/hexToBN";
import web3Utils from "web3-utils";


interface Props {
  createBlockchainChallenge: () => void;
  resign: () => void;
  isNotOurTurn: boolean;
  canChallenge: boolean;
  challengeOngoing: boolean;
  result: Result | Imperative;
  myName: string;
  opponentName: string;
  myBalance: string;
  opponentBalance: string;
  roundBuyIn: string;
  you: Marker;
  rulesRequest: () => void;
  logoutRequest: () => void;
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
  myDot = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="5" fill="white" />
      <circle cx="10" cy="10" r="9.5" stroke="white" />
    </svg>
  )

  opponentDot = () => (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle opacity="0.4" cx="5" cy="5" r="5" fill="white" />
    </svg>
  )

  renderMyDots = count =>
    [...Array(count)].map((e, i) => (
      <div className="col score-dot" key={i}>
        {this.myDot()}
      </div>
    ))

  renderOpponentDots = count =>
    [...Array(count)].map((e, i) => (
      <div className="col score-dot" key={i}>
        {this.opponentDot()}
      </div>
    ))

    renderResultAndButtonsAndDots(
      result: Result | Imperative,
      resign, 
      createBlockchainChallenge,
      isNotOurTurn,
      canChallenge,
      myName,
      myBalance,
      myGameCount,
      opponentGameCount,
      opponentBalance,
      opponentName,
      footerClass,
      footerMsg) {
      return (
        <div>
        <Navbar className="game-bar fixed-top">
        <Button color="link" className="navbar-button mr-auto" onClick={this.props.rulesRequest}>
          Rules
        </Button>
        <div className="container">
          <div className="col-2 my-name text-right"><YourMarker you={this.props.you} />{myName}</div>
          <div className="col-auto my-balance">
            <div className="text-center">
              {web3Utils.fromWei(myBalance, "ether")}
            </div>
            <div className="eth text-center">ETH</div>
          </div>
          <div className="col">
            <div className="row">
              {this.renderMyDots(myGameCount)}
              {this.renderOpponentDots(opponentGameCount)}
            </div>
          </div>
          <div className="col-auto opponent-balance">
            <div className="text-center">
              {web3Utils.fromWei(opponentBalance, "ether")}
            </div>
            <div className="eth text-center">ETH</div>
          </div>
          <span className="col-2 opponent-name">{opponentName}<TheirMarker you={this.props.you} /></span>
        </div>
        
        <Button color="link" className="navbar-button ml-auto" onClick={this.props.logoutRequest}>
          Sign Out
        </Button>
      </Navbar>

        <Navbar id={footerClass} className="navbar fixed-bottom footer-bar">
          {this.renderResignButton(resign, isNotOurTurn)}
          <span>{footerMsg}</span>
          {this.renderChallengeButton( createBlockchainChallenge, canChallenge)}
        </Navbar>
        </div>
      );
    }
      
  render() {
    const {
      myName,
      opponentName,
      myBalance,
      opponentBalance,
      roundBuyIn,
      result,
      resign,
      createBlockchainChallenge,
      isNotOurTurn,
      canChallenge,
    } = this.props;
    
    const myGameCount = Math.round(
      hexToBN(myBalance)
        .div(hexToBN(roundBuyIn))
        .toNumber()
    );
    const opponentGameCount = Math.round(
      hexToBN(opponentBalance)
        .div(hexToBN(roundBuyIn))
        .toNumber()
    );
    
    let footerClass: string = "";
    let footerMsg: string = "";

    switch(result) {
      case Result.Tie:
        footerClass = "tie";
        footerMsg = "It's a draw!";
        break;
      case Result.YouWin:
        footerClass = "you-win";
        footerMsg = "You win!";
        break;
      case Result.YouLose:
        footerClass = "you-lose";
        footerMsg = "You lose!";
        break;
      case Result.GameOverWin:
        footerClass = "you-win";
        footerMsg = "Game Over! You win!";
        break;
      case Result.GameOverLose:
        footerClass = "you-lose";
        footerMsg = "Game Over! You lose!";
        break;
      case Imperative.Choose:
        footerClass = "choose";
        footerMsg = "Choose your move";
        break;
      case Imperative.Wait:
        footerClass = "wait";
        footerMsg = "Wait for opponent";
        break;
    }
      return (
      this.renderResultAndButtonsAndDots(
        result,
        resign, 
        createBlockchainChallenge,
        isNotOurTurn,
        canChallenge,
        myName,
        myBalance,
        myGameCount,
        opponentGameCount,
        opponentBalance,
        opponentName,
        footerClass,
        footerMsg,)
    );
  }
}
