import * as State from './application-states/PlayerB';
import { calculateResult, Play, Position} from './positions';
import PreFundSetup from './positions/PreFundSetup';
import PostFundSetup from './positions/PostFundSetup';
import Reveal from './positions/Reveal';
import Propose from './positions/Propose';
import Accept from './positions/Accept';
import Resting from './positions/Resting';
import Conclude from './positions/Conclude';

export default class GameEngineB {
  static fromProposal(position: Position) {
    if (!(position instanceof PreFundSetup)) {
      throw new Error('Not a PreFundSetup');
    }

    const { channel, stake, resolution: balances, turnNum, stateCount } = position;

    const nextPosition = new PreFundSetup(channel, turnNum + 1, balances, stateCount + 1, stake);

    const appState = new State.ReadyToSendPreFundSetupB({
      channel,
      balances,
      stake,
      position: nextPosition,
    });

    return new GameEngineB(appState);
  }

  static fromState(state: State.PlayerBState) {
    return new GameEngineB(state);
  }

  state: any;

  constructor(state) {
    this.state = state;
  }

  positionSent() {
    const { channel, balances, stake } = this.state;

    switch (this.state.constructor) {
      case State.ReadyToSendPreFundSetupB:
        return this.transitionTo(new State.ReadyToFund({ channel, balances, stake }));
      case State.ReadyToSendPostFundSetupB:
        const stateCount = this.state.stateCount + 1;
        const turnNum = 4; // todo: make this relative
        const nextPosition = new PostFundSetup(channel, turnNum, balances, stateCount, stake);
        return this.transitionTo(
          new State.WaitForPropose({
            channel,
            stake,
            balances,
            position: nextPosition,
          }),
        );
      case State.ReadyToSendAccept:
        const { bPlay, position: nextPosition2 } = this.state;
        return this.transitionTo(
          new State.WaitForReveal({
            channel,
            stake,
            balances,
            bPlay,
            position: nextPosition2,
          }),
        );
      case State.ReadyToSendResting:
        return this.transitionTo(
          new State.WaitForPropose({
            channel,
            stake,
            balances,
            position: this.state.position,
          }),
        );
      default:
        // todo: should we error here?
        return this.state;
    }
  }

  receivePosition(positionReceived: Position) {
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

    return this.transitionTo(
      new State.WaitForPostFundSetupA({ channel, stake, balances }),
    );
  }

  choosePlay(bPlay: Play) {
    if (!(this.state instanceof State.ReadyToChooseBPlay)) {
      return this.state;
    }

    const { channel, stake, balances, preCommit, turnNum } = this.state;

    const newBalances = [...balances];
    newBalances[0] -= stake;
    newBalances[1] += stake;

    const nextPosition = new Accept(channel, turnNum, newBalances, stake, preCommit, bPlay);

    return this.transitionTo(
      new State.ReadyToSendAccept({
        channel,
        stake,
        balances: newBalances,
        bPlay,
        position: nextPosition,
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
    //     move: concludeMove,
    //   });
    // } else if (oldPledge.turnNum % 2 === 1) {
    //   newState = new State.ReadyToSendConcludeB({
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

  receivedPostFundSetup(position: PostFundSetup) {
    if (!(this.state instanceof State.WaitForPostFundSetupA)) {
      return this.state;
    }

    const { channel, stake, balances } = this.state;
    const turnNum = position.turnNum + 1;
    const nextPosition = new PostFundSetup(channel, turnNum, balances, 1, stake);

    return this.transitionTo(
      new State.ReadyToSendPostFundSetupB({
        channel,
        stake,
        balances,
        position: nextPosition,
      }),
    );
  }

  receivedPropose(position: Propose) {
    if (!(this.state instanceof State.WaitForPropose)) {
      return this.state;
    }

    const { channel, stake, resolution: balances, preCommit } = position;
    const turnNum = position.turnNum + 1;

    return this.transitionTo(
      new State.ReadyToChooseBPlay({
        channel,
        stake,
        balances,
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
    const turnNum = oldTurnNum + 1;

    const nextPosition = new Resting(channel, turnNum, balances, stake);
    const result = calculateResult(bPlay, aPlay);
    return this.transitionTo(
      new State.ReadyToSendResting({
        channel,
        stake,
        balances,
        aPlay,
        bPlay,
        result,
        salt,
        position: nextPosition,
      }),
    );
  }

  receivedConclude(position: Conclude) {
    const { channel, resolution: balances } = position;

    const newPosition = new Conclude(channel, position.turnNum + 1, balances);

    // todo: need a move. Might also need an intermediate state here
    return this.transitionTo(
      new State.ReadyToSendConcludeB({ channel, balances, position: newPosition }),
    );
  }
}
