import { Channel } from 'fmg-core';

import * as State from './application-states/PlayerA';
import {
  calculateResult,
  Result,
  Play,
  Position,
  PreFundSetupA,
  PreFundSetupB,
  PostFundSetupA,
  PostFundSetupB,
  Propose,
  Accept,
  Reveal,
  Resting,
  Conclude,
}  from './positions';
import BN from 'bn.js';

const fakeGameLibraryAddress = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';

export default class GameEngineA {
  static setupGame({ me, opponent, stake, balances }: 
    { me: string, opponent: string, stake: BN, balances: BN[] }
  ) {
    const participants = [me, opponent];
    const channel = new Channel(fakeGameLibraryAddress, 456, participants);

    const position = new PreFundSetupA(channel, 0, balances, 0, stake);

    const appState = new State.WaitForPreFundSetup({
      position,
    });

    return new GameEngineA(appState);
  }

  static fromState(state: State.PlayerAState) {
    return new GameEngineA(state);
  }

  state: State.PlayerAState;
 
  constructor(state) {
    this.state = state;
  }

  receivePosition(positionReceived: Position) {
    switch(positionReceived.constructor) {
      case PreFundSetupB:
        return this.receivedPreFundSetup(positionReceived as PreFundSetupB);
      case PostFundSetupB:
        return this.receivedPostFundSetup(positionReceived as PostFundSetupB);
      case Accept:
        return this.receivedAccept(positionReceived as Accept);
      case Resting:
        return this.receivedResting(positionReceived as Resting);
      case Conclude:
        return this.receivedConclude(positionReceived as Conclude);
      default:
        // raise an error?
        return this.state;
    }
  }

  fundingConfirmed() {
    if (!(this.state instanceof State.WaitForFunding)) { return this.state; }

    const { channel, stake, balances } = this.state;
    const stateCount = 0;
    const turnNum = 2;
    const newPosition = new PostFundSetupA(channel, turnNum, balances, stateCount, stake);
    return this.transitionTo(
      new State.WaitForPostFundSetup({
        position: newPosition,
      })
    );
  }

  choosePlay(aPlay: Play) {
    if (!(this.state instanceof State.ChoosePlay)) { return this.state };

    const { balances, turnNum, stake, channel } = this.state;

    const salt = 'salt'; // todo: make random

    const newPosition = Propose.createWithPlayAndSalt(
      channel,
      turnNum + 1,
      balances,
      stake,
      aPlay,
      salt,
    );

    return this.transitionTo(
      new State.WaitForAccept({
        position: newPosition,
        aPlay,
        salt,
      })
    );
  }

  playAgain() {
    // todo

    return this.state;
  }

  conclude() {
    // problem - we don't necessarily have all the stuff here :()

    // const concludePledge = new Conclude(
    //   oldState.channel,
    //   oldPledge.turnNum + 1,
    //   oldState.balances
    // );

    // const concludeMove = this.channelWallet.sign(concludePledge.toHex());

    // if (oldPledge.turnNum % 2 === 0) {
    //   newState = new State.ReadyToSendConcludeA({
    //     ...oldState.commonAttributes,
    //     move: concludeMove,
    //   });
    // } else if (oldPledge.turnNum % 2 === 1) {
    //   newState = new ApplicationStatesB.ReadyToSendConcludeB({
    //     ...oldState.commonAttributes,
    //     move: concludeMove,
    //   });
    // }
    return this.state;
  }

  transitionTo(state) {
    this.state = state;
    return state;
  }

  receivedPreFundSetup(position: PreFundSetupB) {
    if (!(this.state instanceof State.WaitForPreFundSetup)) { return this.state };

    return this.transitionTo(
      new State.WaitForFunding({ position })
    );
  }

  receivedPostFundSetup(position: PostFundSetupB) {
    if (!(this.state instanceof State.WaitForPostFundSetup)) { return this.state };

    const { stake, balances } = this.state;

    if (stake > balances[0] || stake > balances[1]) {
      return this.transitionTo(new State.InsufficientFunds({ position }));
    };

    return this.transitionTo(new State.ChoosePlay({ position }));
  }

  receivedAccept(position: Accept) {
    if (!(this.state instanceof State.WaitForAccept)) { return this.state };

    const { channel, stake, resolution: oldBalances, bPlay, turnNum } = position;
    const { aPlay, salt } = this.state;
    const result = calculateResult(aPlay, bPlay);
   
    const balances = [...oldBalances];
    if (result === Result.Tie) {
      balances[0] = balances[0].add(stake);
      balances[1] =  balances[1].sub(stake);
    } else if (result === Result.YouWin) {
      balances[0] = balances[0].add(balances[0].mul(new BN(2)));
      balances[1] = balances[1].sub(balances[1].mul(new BN(2)));
    }

    const nextPosition = new Reveal(channel, turnNum + 1, balances, stake, bPlay, aPlay, salt);

    return this.transitionTo(new State.WaitForResting({ position: nextPosition }));

  }

  receivedResting(position: Resting) {
    if (!(this.state instanceof State.WaitForResting)) { return this.state };

    const { stake, balances } = this.state;

    if (stake > balances[0] || stake > balances[1]) {
      return this.transitionTo(
        new State.InsufficientFunds({ position })
      );
    }

    return this.transitionTo(new State.ChoosePlay({ position }));
  }

  receivedConclude(position: Conclude) {
    // todo: need a move. Might also need an intermediate state here
    return this.transitionTo(
      new State.WaitForConclude({ position })
    )
  }
}
