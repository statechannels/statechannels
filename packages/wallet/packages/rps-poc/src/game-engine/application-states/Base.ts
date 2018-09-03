import { Player } from '.';
import { Position } from '../positions';

export default class BaseState<T extends Position> {
  readonly position: T;
  player: Player; // overwritten by subclass
  readonly isReadyToSend: boolean;
  readonly isReadyForFunding:boolean;

  constructor({ position }: { position: T }) {
    this.position = position;
  }

  get channel() {
    return this.position.channel;
  }

  get positionHex() {
    return this.position.toHex();
  }

  get balances() {
    return this.position.resolution;
  }

  get turnNum() {
    return this.position.turnNum;
  }

  get playerIndex() {
    return ((this.player === Player.PlayerA) ? 0 : 1);
  }

  get myAddress() {
    return this.channel.participants[this.playerIndex];
  }

  get opponentAddress() {
    return this.channel.participants[1 - this.playerIndex];
  }

  get channelId() {
    return this.channel.id;
  }

  get myBalance() {
    return this.balances[this.playerIndex];
  }

  get opponentBalance() {
    return this.balances[1 - this.playerIndex];
  }
}
