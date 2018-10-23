import * as React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandPaper, faHandScissors } from '@fortawesome/free-solid-svg-icons';

import { Move } from '../core';

export default function MoveIcon({ move }: { move: Move }) {
  switch (move) {
    case Move.Rock:
      return (
        <FontAwesomeIcon style={{ marginLeft: -30 }} icon={faHandRock} size="7x" rotation={90} />
      );
    case Move.Paper:
      return (
        <FontAwesomeIcon style={{ marginLeft: -30 }} icon={faHandPaper} size="7x" rotation={90} />
      );
    case Move.Scissors:
      return (
        <FontAwesomeIcon
          style={{ marginLeft: -20 }}
          icon={faHandScissors}
          size="7x"
          flip="horizontal"
        />
      );
  }
}
