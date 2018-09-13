import _ from 'lodash';
import React from 'react';

import { Button } from 'reactstrap';

import BN from 'bn.js';
import web3Utils from 'web3-utils';

interface Props {
  createChallenge: (name: string, stake: BN) => void;
}

export default class CreateChallenge extends React.PureComponent<Props> {
  wagerInput: any;
  nameInput: any = "";

  constructor(props) {
    super(props);
    this.wagerInput = React.createRef();
    this.nameInput = React.createRef();
    this.createChallengeHandler = this.createChallengeHandler.bind(this);
  }

  componentDidMount() {
    this.nameInput.current.focus();
  }

  createChallengeHandler(e) {
    e.preventDefault();
    const wager = Number(this.wagerInput.current.value);
    const name = String(this.nameInput.current.value);

    if (!wager || Number.isNaN(wager)) {
      return;
    }

    this.props.createChallenge(name, new BN(web3Utils.toWei(wager.toString(), 'finney')));

    this.wagerInput.current.value = '';
    this.nameInput.current.value = '';
  }

  render() {
    return (
      <form onSubmit={(e) => this.createChallengeHandler(e)}>
        <div className='row'>
          <div className='form-group col-sm-6'>
            <label htmlFor="name">Name</label>
            <input className="form-control" type="text" name="name" id="name" placeholder="Name" ref={this.nameInput} />
            <small id="passwordHelpBlock" className="form-text text-muted">
              The name that will show to other players in the challenge list.
            </small>
          </div>
          <div className='form-group col-sm-6'>
            <label htmlFor="wager">Wager</label>
            <input className="form-control" type="number" name="wager" id="wager" placeholder="5" ref={this.wagerInput} />
            <small id="passwordHelpBlock" className="form-text text-muted">
              Your wager in Finney.
            </small>
          </div>
        </div>
        <Button type="submit" block={true} color="primary">Create Challenge</Button>
      </form>
    );
  }
}
