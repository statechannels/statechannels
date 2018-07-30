import React from 'react';
import PropTypes from 'prop-types';

import Button from './Button';

const propTypes = {
  winnings: PropTypes.string.isRequired,
  handleReturnToOpponentSelection: PropTypes.func.isRequired,
};

export default class ConcludeStep extends React.PureComponent {
  render() {
    const { winnings, handleReturnToOpponentSelection } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <h1>The game has concluded.</h1>
        <h3 style={{ width: '100%', paddingBottom: 16 }}>{`You've won ${winnings} Finney!`}</h3>
        <Button onClick={handleReturnToOpponentSelection}>Return to opponent selection</Button>
      </div>
    );
  }
}

ConcludeStep.propTypes = propTypes;
