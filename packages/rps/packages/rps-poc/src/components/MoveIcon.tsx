import * as React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandRock, faHandPaper, faHandScissors } from '@fortawesome/free-solid-svg-icons';

import { Play } from '../game-engine/positions';

export default function MoveIcon({ play }: { play: Play }) {
  switch (play) {
    case Play.Rock:
      return (
        <FontAwesomeIcon style={{ marginLeft: -30 }} icon={faHandRock} size="7x" rotation={90} />
      );
    case Play.Paper:
      return (
        <FontAwesomeIcon style={{ marginLeft: -30 }} icon={faHandPaper} size="7x" rotation={90} />
      );
    case Play.Scissors:
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
