import { Channel } from 'fmg-core';
import BN from 'bn.js';

import { randomHex } from '../utils/randomHex';
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
} from './positions';

export default class GameEngineA {
  static setupGame({ me, opponent, stake, balances, libraryAddress }:
    { me: string, opponent: string, stake: BN, balances: BN[], libraryAddress:string }
  ) {
    const participants = [me, opponent];
    const channel = new Channel(libraryAddress, 456, participants);

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
    switch (positionReceived.constructor) {
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

  choosePlay(aPlay: Play) {
    if (!(this.state instanceof State.ChoosePlay)) { return this.state; }

    const { balances, turnNum, stake, channel } = this.state;

    const salt = randomHex(64);

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
    if (this.state instanceof State.Concluded) {
      return this.state;
    }

    const { channel, balances, turnNum } = this.state;
    const conclude = new Conclude(channel, turnNum + 1, balances);
    if (this.state instanceof State.WaitForConclude
      || this.state instanceof State.ConcludeReceived) {
      return this.transitionTo(
        new State.Concluded({
          position: conclude,
        })
      );
    }

    return this.transitionTo(
      new State.WaitForConclude({
        position: conclude,
      })
    );

  }

  transitionTo(state) {
    this.state = state;
    return state;
  }

  receivedPreFundSetup(position: PreFundSetupB) {
    if (!(this.state instanceof State.WaitForPreFundSetup)) { return this.state; }

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

  receivedPostFundSetup(position: PostFundSetupB) {
    if (!(this.state instanceof State.WaitForPostFundSetup)) { return this.state; }

    if (this.insufficientlyfunded(this.state)) {
      return this.transitionTo(new State.InsufficientFunds({ position }));
    }

    return this.transitionTo(new State.ChoosePlay({ position }));
  }

  receivedAccept(position: Accept) {
    if (!(this.state instanceof State.WaitForAccept)) { return this.state; }

    const { channel, stake, resolution: oldBalances, bPlay, turnNum } = position;
    const { aPlay, salt } = this.state;
    const result = calculateResult(aPlay, bPlay);

    const balances = [...oldBalances];
    if (result === Result.Tie) {
      balances[0] = balances[0].add(stake);
      balances[1] = balances[1].sub(stake);
    } else if (result === Result.YouWin) {
      balances[0] = balances[0].add(stake.mul(new BN(2)));
      balances[1] = balances[1].sub(stake.mul(new BN(2)));
    }

    const nextPosition = new Reveal(channel, turnNum + 1, balances, stake, bPlay, aPlay, salt);

    return this.transitionTo(new State.WaitForResting({ position: nextPosition }));

  }

  receivedResting(position: Resting) {
    if (!(this.state instanceof State.WaitForResting)) { return this.state; }

    if (this.insufficientlyfunded(this.state)) {
      return this.transitionTo(
        new State.InsufficientFunds({ position })
      );
    }

    return this.transitionTo(new State.ChoosePlay({ position }));
  }

  insufficientlyfunded(state: State.WaitForResting | State.WaitForPostFundSetup): boolean {
    const { stake, balances } = state;
    return stake.gt(balances[0]) || stake.gt(balances[1]);
  }

  receivedConclude(position: Conclude) {
    if (this.state instanceof State.Concluded) {
      return this.state;
    }

    if (this.state instanceof State.WaitForConclude) {
      return this.transitionTo(new State.Concluded({
        position: this.state.position,
      }));
    }
    const { channel, balances } = this.state;
    const conclude = new Conclude(channel, position.turnNum + 1, balances);
    return this.transitionTo(new State.ConcludeReceived({ position: conclude }));
  }
}
