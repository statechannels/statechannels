import _ from 'lodash';
import React from 'react';

import Button from './Button';

interface Props {
  createChallenge: (challenge: any) => void;
  currentPlayer?: {
    address: string;
    name: string;
  };
}

export default class CreateChallenge extends React.PureComponent<Props> {
  wagerInput: any;

  constructor(props) {
    super(props);
    this.wagerInput = React.createRef();
    this.createChallengeHandler = this.createChallengeHandler.bind(this);
  }

  createChallengeHandler() {
    const wager = Number(this.wagerInput.current.value);

    if (!wager || Number.isNaN(wager)) {
      return;
    }

    const currentPlayer = this.props.currentPlayer;
    this.props.createChallenge({
      address: currentPlayer && currentPlayer.address,
      lastSeen: Date.now(),
      name: currentPlayer && currentPlayer.name,
      wager,
    });

    this.wagerInput.current.value = '';
  }

  render() {
    return (
      <div>
        <Button onClick={this.createChallengeHandler}>Create challenge</Button>
        <input ref={this.wagerInput} />
      </div>
    );
  }
}
