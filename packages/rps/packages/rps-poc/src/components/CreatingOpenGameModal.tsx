import _ from 'lodash';
import React from 'react';

import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';

import web3Utils from 'web3-utils';

interface Props {
  visible: boolean;
  createOpenGame: (roundBuyIn: string) => void;
  cancelOpenGame: () => void;
}
interface State {
  errorMessage: string;
  buyIn: string;
  buyInChanged: boolean;
}
const MIN_BUYIN = 0.001;
const MAX_BUYIN = 1;

export default class CreatingOpenGameModal extends React.PureComponent<Props, State> {
  buyInInput: any;

  constructor(props) {
    super(props);
    this.buyInInput = React.createRef();
    this.state = { errorMessage: "", buyIn: "", buyInChanged: false };
    this.createOpenGameHandler = this.createOpenGameHandler.bind(this);
    this.handleBuyInChange = this.handleBuyInChange.bind(this);
    this.modalClosed = this.modalClosed.bind(this);
  }

  handleBuyInChange(e) {
    const buyIn = Number(e.target.value);
    let errorMessage = "";
    if (e.target.value === "") {
      errorMessage = "Please enter a buy in amount";
    } else if (Number.isNaN(buyIn)) {
      errorMessage = "Please enter a number for the buy in";
    } else if (buyIn < MIN_BUYIN || buyIn > MAX_BUYIN) {
      errorMessage = `Invalid buy in amount ${this.state.buyIn}. Please enter an amount between ${MIN_BUYIN} and ${MAX_BUYIN}`;

    }
    this.setState({ errorMessage, buyIn: e.target.value, buyInChanged: true });
  }

  componentDidUpdate() {
    if (this.buyInInput.current) {
      this.buyInInput.current.focus();
    }
  }

  createOpenGameHandler(e) {
    e.preventDefault();
    if (this.state.errorMessage === "") {
      this.props.createOpenGame(web3Utils.toWei(this.state.buyIn, 'ether'));
    } else {
      this.setState({ buyInChanged: true });
    }
  }

  modalClosed() {
    this.setState({ errorMessage: "", buyIn: "", buyInChanged: false });
    this.props.cancelOpenGame();
  }

  calculateRoundBuyIn() {
    const roundBuyIn = parseFloat(this.state.buyIn)/5;
    if (roundBuyIn) {
      return roundBuyIn;
    }
    return "";
  }

  render() {

    return (
      <Modal className="cog-container" toggle={this.modalClosed} isOpen={this.props.visible} centered={true}>
        <ModalHeader className="rules-header">
          Create A Game
      </ModalHeader>

        <ModalBody>
          <form className="cog-form" onSubmit={e => this.createOpenGameHandler(e)}>
            <div className="form-group">
              <label htmlFor="buyin">Enter Game Buy In Amount</label>
              <div className="cog-input-group">
                <input
                  className="cog-input form-control"
                  name="buyin"
                  id="buyin"
                  value={this.state.buyIn}
                  ref={this.buyInInput}
                  onChange={e => this.handleBuyInChange(e)}
                />
                <div>ETH</div>
              </div>
              <small className="form-text text-muted">
                {
                  `Please enter an amount between ${MIN_BUYIN} and ${MAX_BUYIN}`
                }
              </small>

              <small className="form-text text-danger cog-error-message">
                {this.state.errorMessage}
              </small>

              <div className="mt-2">Round Buy In:</div>
              <small className="form-text text-muted">
                This is 20% of the total buy in amount.
              </small>
            </div>
            <Button className="cog-button" type="submit" disabled={this.state.errorMessage !== ""} block={true}>
              Create Game
          </Button>
          </form>
        </ModalBody>
      </Modal>
    );
  }
}