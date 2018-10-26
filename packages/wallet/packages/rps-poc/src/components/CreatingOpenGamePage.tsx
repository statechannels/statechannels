import _ from 'lodash';
import React from 'react';

import { Button, ButtonGroup } from 'reactstrap';

import web3Utils from 'web3-utils';
import { ApplicationLayout } from './ApplicationLayout';

interface Props {
  createOpenGame: (roundBuyIn: string) => void;
  cancelOpenGame: () => void;
}

export default class CreatingOpenGamePage extends React.PureComponent<Props> {
  wagerInput: any;

  constructor(props) {
    super(props);
    this.wagerInput = React.createRef();
    this.createOpenGameHandler = this.createOpenGameHandler.bind(this);
  }

  componentDidMount() {
    this.wagerInput.current.focus();
  }

  createOpenGameHandler(e) {
    e.preventDefault();
    const wager = Number(this.wagerInput.current.value);

    if (!wager || Number.isNaN(wager)) {
      return;
    }

    this.props.createOpenGame(web3Utils.toWei(wager.toString(), 'finney'));

    this.wagerInput.current.value = '';
  }

  render() {
    return (
      <ApplicationLayout>

        <ButtonGroup className="d-flex w-100 mb-3">
          <Button
            className="w-50"
            outline={true}
            onClick={this.props.cancelOpenGame}
          >
            Select an opponent
            </Button>
          <Button
            className="w-50"
            outline={false}
          >
            Create a game
            </Button>
        </ButtonGroup>

        <form onSubmit={e => this.createOpenGameHandler(e)}>
          <div className="row">
            <div className="form-group col-sm-6">
              <label htmlFor="wager">Wager</label>
              <input
                className="form-control"
                type="number"
                name="wager"
                id="wager"
                placeholder="5"
                ref={this.wagerInput}
              />
              <small id="passwordHelpBlock" className="form-text text-muted">
                Your wager in Finney.
                </small>
            </div>
          </div>
          <Button type="submit" block={true} color="primary">
            Create Challenge
            </Button>
        </form>
      </ApplicationLayout>
    );
  }
}
