import _ from 'lodash';
import React from 'react';

import Button from './Button';

interface Props {
  createChallenge: (name: string, stake: number) => void;
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

    this.props.createChallenge(name, wager);

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
