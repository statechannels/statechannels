import * as State from './application-states/PlayerB';
import Message from './Message';
import ChannelWallet from './ChannelWallet';
import decodePledge from './pledges/decode';
import { calculateResult, Play }  from './pledges';
import PreFundSetup from './pledges/PreFundSetup';
import PostFundSetup from './pledges/PostFundSetup';
import Reveal from './pledges/Reveal';
import Propose from './pledges/Propose';
import Accept from './pledges/Accept';
import Resting from './pledges/Resting';
import Conclude from './pledges/Conclude';

export default class GameEngineB {

  static fromProposal({ message, wallet }: { message: Message, wallet: ChannelWallet }) {
    const position = decodePledge(message.state);

    if (!(position instanceof PreFundSetup)) { throw new Error('Not a PreFundSetup'); }

    const { channel, stake, resolution: balances, turnNum, stateCount } = position;

    const nextPledge = new PreFundSetup(channel, turnNum + 1, balances, stateCount + 1, stake);

    const nextMessage = wallet.sign(nextPledge.toHex());

    const appState = new State.ReadyToSendPreFundSetupB({
      channel,
      balances,
      stake,
      message: nextMessage,
    });

    return new GameEngineB(wallet, appState);
  }

  static fromState({ state, wallet }: { state: State.PlayerBState, wallet: ChannelWallet }) {
    return new GameEngineB(wallet, state);
  }

  channelWallet: ChannelWallet;
  state: any;

  constructor(channelWallet, state) {
    this.channelWallet = channelWallet;
    this.state = state;
  }

  messageSent() {
    const { channel, balances, stake } = this.state;

    switch(this.state.constructor) {
      case State.ReadyToSendPreFundSetupB:
        return this.transitionTo(
          new State.WaitForAToDeploy({ channel, balances, stake })
        )
      case State.ReadyToSendPostFundSetupB:
        const stateCount = this.state.stateCount + 1;
        const turnNum = 4; // todo: make this relative
        const nextPosition = new PostFundSetup(channel, turnNum, balances, stateCount, stake);
        const message = this.channelWallet.sign(nextPosition.toHex());
        return this.transitionTo(
          new State.WaitForPropose({
            channel,
            stake,
            balances,
            adjudicator: this.state.adjudicator,
            message,
          })
        )
      case State.ReadyToSendAccept:
        const { bPlay, message: message2, adjudicator } = this.state;
        return this.transitionTo(
          new State.WaitForReveal({
            channel,
            stake,
            balances,
            bPlay,
            adjudicator,
            message: message2
          })
        );
      default:
        // todo: should we error here?
        return this.state;
    }
  }

  receiveMessage(message: Message) {
    const positionReceived = decodePledge(message.state);

    switch(positionReceived.constructor) {
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

  transactionSent() {
    if (!(this.state instanceof State.ReadyToDeposit)) { return this.state };

    const { channel, stake, balances, adjudicator } = this.state;

    return this.transitionTo(
      new State.WaitForPostFundSetupA({ channel, stake, balances, adjudicator })
    );
  }

  receiveEvent(event) {
    if (!(this.state instanceof State.WaitForAToDeploy)) { return this.state };

    const { channel, stake, balances } = this.state;
    const adjudicator = event.adjudicator;
    const transaction = 'todo: generate this';

    return this.transitionTo(
      new State.ReadyToDeposit({ channel, stake, balances, adjudicator, transaction })
    );
  }

  choosePlay(bPlay: Play) {
    if (!(this.state instanceof State.ReadyToChooseBPlay)) { return this.state };

    const { channel, stake, balances, preCommit, adjudicator, turnNum } = this.state;

    const newBalances = [...balances];
    newBalances[0] -= stake;
    newBalances[1] += stake;

    const nextPosition = new Accept(channel, turnNum, newBalances, stake, preCommit, bPlay);

    const message = this.channelWallet.sign(nextPosition.toHex());

    return this.transitionTo(
      new State.ReadyToSendAccept({
        channel,
        stake,
        balances: newBalances,
        adjudicator,
        bPlay,
        message,
      })
    );
  }

  conclude() {
    // problem - we don't necessarily have all the stuff here :()

    // const { message } = oldState;
    // const oldPledge = decodePledge(message.state);
    // let newState;

    // const concludePledge = new Conclude(
    //   oldState.channel,
    //   oldPledge.turnNum + 1,
    //   oldState.balances
    // );

    // const concludeMessage = this.channelWallet.sign(concludePledge.toHex());

    // if (oldPledge.turnNum % 2 === 0) {
    //   newState = new ApplicationStatesA.ReadyToSendConcludeA({
    //     ...oldState.commonAttributes,
    //     adjudicator: oldState.adjudicator,
    //     message: concludeMessage,
    //   });
    // } else if (oldPledge.turnNum % 2 === 1) {
    //   newState = new State.ReadyToSendConcludeB({
    //     ...oldState.commonAttributes,
    //     adjudicator: oldState.adjudicator,
    //     message: concludeMessage,
    //   });
    // }
    return this.state;
  }

  transitionTo(state) {
    this.state = state;
    return state;
  }

  receivedPostFundSetup(position: PostFundSetup) {
    if (!(this.state instanceof State.WaitForPostFundSetupA)) { return this.state };

    const { channel, stake, balances, adjudicator } = this.state;
    const turnNum = position.turnNum + 1;
    const nextPosition = new PostFundSetup(channel, turnNum, balances, 1, stake);
    const message = this.channelWallet.sign(nextPosition.toHex());

    return this.transitionTo(
      new State.ReadyToSendPostFundSetupB({ channel, stake, balances, adjudicator, message })
    );
  }

  receivedPropose(position: Propose) {
    if (!(this.state instanceof State.WaitForPropose)) { return this.state };

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
      })
    );
  }

  receivedReveal(position: Reveal) {
    if (!(this.state instanceof State.WaitForReveal)) { return this.state };

    const {
      channel,
      turnNum: oldTurnNum,
      resolution: balances,
      stake,
      aPlay,
      bPlay,
      salt
    } = position;
    const { adjudicator } = this.state;
    const turnNum = oldTurnNum + 1;

    const nextPosition = new Resting(channel, turnNum, balances, stake);
    const message = this.channelWallet.sign(nextPosition.toHex());
    const result = calculateResult(aPlay, bPlay);

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
        message,
      })
    );
  }

  receivedConclude(position: Conclude) {
    const { channel, resolution: balances } = position;
    const { adjudicator } = this.state;

    const newPosition = new Conclude(channel, position.turnNum + 1, balances);
    const message = this.channelWallet.sign(newPosition.toHex());

    // todo: need a message. Might also need an intermediate state here
    return this.transitionTo(
      new State.ReadyToSendConcludeB({ channel, balances, adjudicator, message })
    )
  }
}
