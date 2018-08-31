import { Channel } from 'fmg-core';

import * as State from './application-states/PlayerA';
import { calculateResult, Result, Play, Position }  from './positions';
import PreFundSetup from './positions/PreFundSetup';
import PostFundSetup from './positions/PostFundSetup';
import Propose from './positions/Propose';
import Accept from './positions/Accept';
import Reveal from './positions/Reveal';
import Resting from './positions/Resting';
import Conclude from './positions/Conclude';

const fakeGameLibraryAddress = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';

export default class GameEngineA {
  static setupGame({ me, opponent, stake, balances }: 
    { me: string, opponent: string, stake: number, balances: number[] }
  ) {
    const participants = [me, opponent];
    const channel = new Channel(fakeGameLibraryAddress, 456, participants);

    const position = new PreFundSetup(channel, 0, balances, 0, stake);

    const appState = new State.ReadyToSendPreFundSetupA({
      channel,
      stake,
      balances,
      position,
    });

    return new GameEngineA(appState);
  }

  static fromState(state: State.PlayerAState) {
    return new GameEngineA(state);
  }

  state: any;
 
  constructor(state) {
    this.state = state;
  }

  positionSent() {
    switch(this.state.constructor) {
      case State.ReadyToSendPreFundSetupA:
        return this.transitionTo(
          new State.WaitForPreFundSetupB({
            ...this.state.commonAttributes,
            position: this.state.position,
          })
        );
      case State.ReadyToSendPostFundSetupA:
        return this.transitionTo(
          new State.WaitForPostFundSetupB({
            ...this.state.commonAttributes,
            position: this.state.position,
          })
        );
      case State.ReadyToSendPropose:
        return this.transitionTo(
          new State.WaitForAccept({
            ...this.state.commonAttributes,
            aPlay: this.state.aPlay,
            salt: this.state.salt,
            position: this.state.position,
          })
        );
      case State.ReadyToSendReveal:
        return this.transitionTo(
          new State.WaitForResting(this.state)
        );
      default:
        // todo: should we error here?
        return this.state;
    }
  }

  receivePosition(positionReceived: Position) {
    switch(positionReceived.constructor) {
      case PreFundSetup:
        return this.receivedPreFundSetup(positionReceived as PreFundSetup);
      case PostFundSetup:
        return this.receivedPostFundSetup(positionReceived as PostFundSetup);
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

  fundingConfirmed(event) {
    const { channel, stake, balances } = this.state;
    const stateCount = 0;
    const turnNum = 2;
    const newPosition = new PostFundSetup(channel, turnNum, balances, stateCount, stake);
    return this.transitionTo(
      new State.ReadyToSendPostFundSetupA({
        channel,
        stake,
        balances,
        position: newPosition,
      })
    );
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

  choosePlay(aPlay: Play) {
    if (!(this.state instanceof State.ReadyToChooseAPlay)) { return this.state };

    const { balances, turnNum, stake, channel } = this.state;

    const salt = 'salt'; // todo: make random

    const newPosition = Propose.createWithPlayAndSalt(
      channel,
      turnNum,
      balances,
      stake,
      aPlay,
      salt,
    );

    return this.transitionTo(
      new State.ReadyToSendPropose({
        channel,
        stake,
        balances, 
        aPlay,
        salt,
        position: newPosition,
      })
    );
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

  receivedPreFundSetup(position: PreFundSetup) {
    if (!(this.state instanceof State.WaitForPreFundSetupB)) { return this.state };

    const { channel, stake, balances } = this.state;
    return this.transitionTo(
      new State.ReadyToFund({ channel, stake, balances })
    );
  }

  receivedPostFundSetup(position: PostFundSetup) {
    if (!(this.state instanceof State.WaitForPostFundSetupB)) { return this.state };

    const { channel, stake, balances } = this.state;

    if (this.state.stake > this.state.balances[0] || this.state.stake > this.state.balances[0]) {
      return this.transitionTo(
        new State.InsufficientFundsA({
          channel, balances,
        })
      )
    };

    const turnNum = position.turnNum + 1;

    return this.transitionTo(
      new State.ReadyToChooseAPlay({ channel, stake, balances, turnNum })
    );
  }

  receivedAccept(position: Accept) {
    if (!(this.state instanceof State.WaitForAccept)) { return this.state };

    const { channel, stake, resolution: oldBalances, bPlay, turnNum } = position;
    const { aPlay, salt } = this.state;
    const result = calculateResult(aPlay, bPlay);

    const balances = [...oldBalances];
    if (result === Result.Tie) {
      balances[0] += stake;
      balances[1] -= stake;
    } else if (result === Result.YouWin) {
      balances[0] += 2 * stake;
      balances[1] -= 2 * stake;
    }

    const nextPosition = new Reveal(channel, turnNum + 1, balances, stake, bPlay, aPlay, salt);

    return this.transitionTo(
      new State.ReadyToSendReveal({
        channel,
        stake,
        balances,
        aPlay,
        bPlay,
        result,
        salt,
        position: nextPosition,
      })
    );

  }

  receivedResting(position: Resting) {
    if (!(this.state instanceof State.WaitForResting)) { return this.state };

    const { channel, turnNum: oldTurnNum, resolution: balances, stake } = position;
    const turnNum = oldTurnNum + 1;

    const insufficientFundState = this.insufficientFundState()
    if (insufficientFundState) {
      return this.transitionTo(insufficientFundState)
    }

    return this.transitionTo(
      new State.ReadyToChooseAPlay({channel, stake, balances, turnNum })
    );
  }

  receivedConclude(position: Conclude) {
    const { channel, resolution: balances } = position;

    // todo: need a move. Might also need an intermediate state here
    return this.transitionTo(
      new State.ReadyToSendConcludeA({ channel, balances })
    )
  }

  insufficientFundState() : State.InsufficientFunds | null {
    if (this.state.stake > this.state.balances[0]) {
      const { channel, balances } = this.state
      return new State.InsufficientFundsA({
        channel, balances,
      })
    } else if (this.state.stake > this.state.balances[1]) {
      const { channel, balances } = this.state
      return new State.InsufficientFundsB({
        channel, balances,
      })
    }

    return null;
  }
}
