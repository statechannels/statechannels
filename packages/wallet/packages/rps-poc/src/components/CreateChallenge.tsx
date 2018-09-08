import _ from 'lodash';
import React from 'react';

import Button from './Button';
import BN from 'bn.js';
import web3Utils from 'web3-utils';

interface Props {
  createChallenge: (name: string, stake: BN) => void;
}

export default class CreateChallenge extends React.PureComponent<Props> {
  wagerInput: any;
  nameInput: any;

  constructor(props) {
    super(props);
    this.wagerInput = React.createRef();
    this.nameInput = React.createRef();
    this.createChallengeHandler = this.createChallengeHandler.bind(this);
  }

  createChallengeHandler() {
    const wager = Number(this.wagerInput.current.value);
    const name = String(this.nameInput.current.value);

    if (!wager || Number.isNaN(wager)) {
      return;
    }

    this.props.createChallenge(name, new BN(web3Utils.toWei(wager.toString(),'finney')));

    this.wagerInput.current.value = '';
    this.nameInput.current.value = '';
  }

  render() {
    return (
      <div>
        <Button onClick={this.createChallengeHandler}>Create challenge</Button>
        <input ref={this.wagerInput} placeholder='5' />
        <input ref={this.nameInput} placeholder='Your name' />
      </div>
    );
  }
}
