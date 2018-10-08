import * as State from './application-states/PlayerB';
import {
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
import BN from 'bn.js';
import { WaitForConclude } from './application-states/PlayerA';

export default class GameEngineB {
  static fromProposal(position: Position) {
    if (!(position instanceof PreFundSetupA)) {
      throw new Error('Not a PreFundSetup');
    }

    const { channel, stake, resolution: balances, turnNum, stateCount } = position;

    const nextPosition = new PreFundSetupB(channel, turnNum + 1, balances, stateCount + 1, stake);

    const appState = new State.WaitForFunding({ position: nextPosition });

    return new GameEngineB(appState);
  }

  static fromState(state: State.PlayerBState) {
    return new GameEngineB(state);
  }

  state: State.PlayerBState;

  constructor(state) {
    this.state = state;
  }

  receivePosition(positionReceived: Position) {
    switch (positionReceived.constructor) {
      case PostFundSetupA:
        return this.receivedPostFundSetup(positionReceived as PostFundSetupA);
      case Propose:
        return this.receivedPropose(positionReceived as Propose);
      case Reveal:
        return this.receivedReveal(positionReceived as Reveal);
      case Conclude:
        return this.receivedConclude(positionReceived as Conclude);
      default:
        // raise an error?
        return this.state;
    }
  }

  fundingConfirmed() {
    if (!(this.state instanceof State.WaitForFunding)) {
      return this.state;
    }

    return this.transitionTo(
      new State.WaitForPostFundSetup({ position: this.state.position }),
    );
  }

  choosePlay(bPlay: Play) {
    if (!(this.state instanceof State.ChoosePlay)) {
      return this.state;
    }

    const { channel, stake, balances, preCommit, turnNum } = this.state;

    const newBalances: BN[] = [];
    newBalances[0] = balances[0].sub(stake);
    newBalances[1] = balances[1].add(stake);

    const nextPosition = new Accept(channel, turnNum + 1, newBalances, stake, preCommit, bPlay);

    return this.transitionTo(new State.WaitForReveal({ position: nextPosition }));
  }

  playAgain() {
    if (!(this.state instanceof State.ViewResult)) {
      return this.state;
    }

    const position = this.state.position;

    return this.transitionTo(new State.WaitForPropose({ position }));
  }

  conclude() {
    if (this.state instanceof State.Concluded) {
      return this.state;
    }

    const { channel, balances, turnNum } = this.state;
    const conclude = new Conclude(channel, turnNum + 1, balances);
    if (this.state instanceof WaitForConclude) {
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

  receivedPostFundSetup(position: PostFundSetupA) {
    if (!(this.state instanceof State.WaitForPostFundSetup)) {
      return this.state;
    }

    const { channel, stake, balances } = this.state;
    const turnNum = position.turnNum + 1;
    const nextPosition = new PostFundSetupB(channel, turnNum, balances, 1, stake);

    return this.transitionTo(new State.WaitForPropose({ position: nextPosition }));
  }

  receivedPropose(position: Propose) {
    if (!(this.state instanceof State.WaitForPropose)) {
      return this.state;
    }

    return this.transitionTo(new State.ChoosePlay({ position }));
  }

  receivedReveal(position: Reveal) {
    if (!(this.state instanceof State.WaitForReveal)) {
      return this.state;
    }

    const {
      channel,
      turnNum: oldTurnNum,
      resolution: balances,
      stake,
      aPlay,
      bPlay,
    } = position;
    const turnNum = oldTurnNum + 1;

    const nextPosition = new Resting(channel, turnNum, balances, stake);
    return this.transitionTo(
      new State.ViewResult({ position: nextPosition, aPlay, bPlay }),
    );
  }

  receivedConclude(position: Conclude) {
    if (this.state instanceof State.Concluded) {
      return this.state;
    }
    const { channel, balances } = this.state;
    const turnNum = position.turnNum + 1;
    const conclude = new Conclude(channel, turnNum, balances);
    return this.transitionTo(new State.Concluded({
      position: conclude,
    }));
  }
}
