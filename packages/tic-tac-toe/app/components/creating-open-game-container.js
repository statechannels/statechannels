import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

export default class CreatingOpenGameContainerComponent extends Component {
  @tracked buyIn = '';
  MIN_BUYIN = 0.001;
  MAX_BUYIN = 1;

  get errorMessage() {
    if (this.buyIn === '') {
      return 'Please enter a game buy in amount';
    } else if (Number.isNaN(this.buyIn)) {
      return 'Please enter a number for the game buy in';
    } else if (this.buyIn < this.MIN_BUYIN || this.buyIn > this.MAX_BUYIN) {
      return `Invalid game buy in amount ${this.buyIn}. Please enter an amount between ${this.MIN_BUYIN} and ${this.MAX_BUYIN}`;
    }
    return '';
  }

  get buyInChanged() {
    return this.buyIn !== '';
  }

  get roundBuyIn() {
    const roundBuyIn = parseFloat(this.buyIn) / 5;
    if (roundBuyIn) {
      return roundBuyIn;
    }
    return '';
  }

  get isSubmitDisabled() {
    return this.errorMessage !== '' || !this.buyInChanged;
  }

  @action
  handleBuyInChange(e) {
    this.buyIn = e.target.value;
  }

  @action
  modalClosed() {
    this.buyIn = '';
    this.args.onHidden();
  }
}
