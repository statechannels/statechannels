import React from 'react';

import { Move } from '../core';
import ROCK_BADGE from '../images/rock_badge.svg';
import PAPER_BADGE from '../images/paper_badge.svg';
import SCISSORS_BADGE from '../images/scissors_badge.svg';

interface Props {
  move: Move;
  action?: () => void;
}

interface State {
  hover: boolean;
}
const initialState = { hover: false };

export class MoveBadge extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = initialState;
    this.hoverOn = this.hoverOn.bind(this);
    this.hoverOff = this.hoverOff.bind(this);
  }

  hoverOn() {
    this.setState({ hover: true });
  }

  hoverOff() {
    this.setState({ hover: false });
  }

  // todo: get hover to change the appearance
  render() {
    const { move, action } = this.props;
    switch (move) {
      case Move.Rock:
        return <img className='move-badge' src={ROCK_BADGE} onClick={action} onMouseEnter={this.hoverOn} onMouseLeave={this.hoverOff} />;
      case Move.Paper:
        return <img className='move-badge' src={PAPER_BADGE} onClick={action} />;
      default: // Move.Scissors:
        return <img className='move-badge' src={SCISSORS_BADGE} onClick={action} />;
    }
  }
}
