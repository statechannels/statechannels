import * as State from './application-states/PlayerB';
import Move from './Move';
import decodePledge from './positions/decode';
import { calculateResult, Play } from './positions';
import PreFundSetup from './positions/PreFundSetup';
import PostFundSetup from './positions/PostFundSetup';
import Reveal from './positions/Reveal';
import Propose from './positions/Propose';
import Accept from './positions/Accept';
import Resting from './positions/Resting';
import Conclude from './positions/Conclude';
import { Wallet } from '../wallet';

export default class GameEngineB {
  static fromProposal({ move, wallet }: { move: Move; wallet: Wallet }) {
    const position = decodePledge(move.state);

    if (!(position instanceof PreFundSetup)) {
      throw new Error('Not a PreFundSetup');
    }

    const { channel, stake, resolution: balances, turnNum, stateCount } = position;

    const nextPledge = new PreFundSetup(channel, turnNum + 1, balances, stateCount + 1, stake);

    const nextMove = new Move(nextPledge.toHex(), wallet.sign(nextPledge.toHex()));

    const appState = new State.ReadyToSendPreFundSetupB({
      channel,
      balances,
      stake,
      move: nextMove,
    });

    return new GameEngineB(wallet, appState);
  }

  static fromState({ state, wallet }: { state: State.PlayerBState; wallet: Wallet }) {
    return new GameEngineB(wallet, state);
  }

  wallet: Wallet;
  state: any;

  constructor(wallet, state) {
    this.wallet = wallet;
    this.state = state;
  }

  moveSent() {
    const { channel, balances, stake } = this.state;

    switch (this.state.constructor) {
      case State.ReadyToSendPreFundSetupB:
        return this.transitionTo(new State.ReadyToFund({ channel, balances, stake }));
      case State.ReadyToSendPostFundSetupB:
        const stateCount = this.state.stateCount + 1;
        const turnNum = 4; // todo: make this relative
        const nextPosition = new PostFundSetup(channel, turnNum, balances, stateCount, stake);
        const move = new Move(nextPosition.toHex(), this.wallet.sign(nextPosition.toHex()));
        return this.transitionTo(
          new State.WaitForPropose({
            channel,
            stake,
            balances,
            adjudicator: this.state.adjudicator,
            move,
          }),
        );
      case State.ReadyToSendAccept:
        const { bPlay, move: move2, adjudicator } = this.state;
        return this.transitionTo(
          new State.WaitForReveal({
            channel,
            stake,
            balances,
            bPlay,
            adjudicator,
            move: move2,
          }),
        );
      case State.ReadyToSendResting:
        return this.transitionTo(
          new State.WaitForPropose({
            channel,
            stake,
            balances,
            adjudicator: this.state.adjudicator,
            move: this.state.move,
          }),
        );
      default:
        // todo: should we error here?
        return this.state;
    }
  }

  receiveMove(move: Move) {
    const positionReceived = decodePledge(move.state);

    switch (positionReceived.constructor) {
      case PostFundSetup:
        return this.receivedPostFundSetup(positionReceived as PostFundSetup);
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

  fundingRequested() {
    if (!(this.state instanceof State.ReadyToFund)) { return this.state; }
    const { channel, stake, balances } = this.state;
    return this.transitionTo(new State.WaitForFunding({
      channel,
      stake,
      balances,
    }));
  }

  
  fundingConfirmed(event) {
    if (!(this.state instanceof State.WaitForFunding)) {
      return this.state;
    }

    const { channel, stake, balances } = this.state;
    const { adjudicator } = event;

    return this.transitionTo(
      new State.WaitForPostFundSetupA({ channel, stake, balances, adjudicator }),
    );
  }

  choosePlay(bPlay: Play) {
    if (!(this.state instanceof State.ReadyToChooseBPlay)) {
      return this.state;
    }

    this.validateBalances();

    const { channel, stake, balances, preCommit, adjudicator, turnNum } = this.state;

    const newBalances = [...balances];
    newBalances[0] -= stake;
    newBalances[1] += stake;

    const nextPosition = new Accept(channel, turnNum, newBalances, stake, preCommit, bPlay);

    const move = new Move(nextPosition.toHex(), this.wallet.sign(nextPosition.toHex()));

    return this.transitionTo(
      new State.ReadyToSendAccept({
        channel,
        stake,
        balances: newBalances,
        adjudicator,
        bPlay,
        move,
      }),
    );
  }

  conclude() {
    // problem - we don't necessarily have all the stuff here :()

    // const { move } = oldState;
    // const oldPledge = decodePledge(move.state);
    // let newState;

    // const concludePledge = new Conclude(
    //   oldState.channel,
    //   oldPledge.turnNum + 1,
    //   oldState.balances
    // );

    // const concludeMove = this.Wallet.sign(concludePledge.toHex());

    // if (oldPledge.turnNum % 2 === 0) {
    //   newState = new ApplicationStatesA.ReadyToSendConcludeA({
    //     ...oldState.commonAttributes,
    //     adjudicator: oldState.adjudicator,
    //     move: concludeMove,
    //   });
    // } else if (oldPledge.turnNum % 2 === 1) {
    //   newState = new State.ReadyToSendConcludeB({
    //     ...oldState.commonAttributes,
    //     adjudicator: oldState.adjudicator,
    //     move: concludeMove,
    //   });
    // }
    return this.state;
  }

  transitionTo(state) {
    this.state = state;
    return state;
  }

  receivedPostFundSetup(position: PostFundSetup) {
    if (!(this.state instanceof State.WaitForPostFundSetupA)) {
      return this.state;
    }

    const { channel, stake, balances } = this.state;
    const turnNum = position.turnNum + 1;
    const nextPosition = new PostFundSetup(channel, turnNum, balances, 1, stake);
    const move = new Move(nextPosition.toHex(), this.wallet.sign(nextPosition.toHex()));

    return this.transitionTo(
      new State.ReadyToSendPostFundSetupB({
        channel,
        stake,
        balances,
        move,
        adjudicator: this.state.adjudicator,
      }),
    );
  }

  receivedPropose(position: Propose) {
    if (!(this.state instanceof State.WaitForPropose)) {
      return this.state;
    }

    const { channel, stake, resolution: balances, preCommit } = position;
    const turnNum = position.turnNum + 1;
    const { adjudicator } = this.state;

    return this.transitionTo(
      new State.ReadyToChooseBPlay({
        channel,
        stake,
        balances,
        adjudicator,
        turnNum,
        preCommit,
      }),
    );
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
      salt,
    } = position;
    const { adjudicator } = this.state;
    const turnNum = oldTurnNum + 1;

    const nextPosition = new Resting(channel, turnNum, balances, stake);
    const move = new Move(nextPosition.toHex(), this.wallet.sign(nextPosition.toHex()));
    const result = calculateResult(bPlay, aPlay);
    return this.transitionTo(
      new State.ReadyToSendResting({
        channel,
        stake,
        balances,
        adjudicator,
        aPlay,
        bPlay,
        result,
        salt,
        move,
      }),
    );
  }

  receivedConclude(position: Conclude) {
    const { channel, resolution: balances } = position;
    const { adjudicator } = this.state;

    const newPosition = new Conclude(channel, position.turnNum + 1, balances);
    const move = new Move(newPosition.toHex(), this.wallet.sign(newPosition.toHex()));

    // todo: need a move. Might also need an intermediate state here
    return this.transitionTo(
      new State.ReadyToSendConcludeB({ channel, balances, adjudicator, move }),
    );
  }

  validateBalances() {
    if (this.state.stake > this.state.balances[1]) {
      throw Error('Insufficient balance for player B.');
    }
  }
}
