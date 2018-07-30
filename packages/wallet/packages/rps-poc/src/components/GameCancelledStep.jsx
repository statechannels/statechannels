import React from 'react';
import PropTypes from 'prop-types';

import Button from './Button';

const propTypes = {
  cancelledByYou: PropTypes.bool.isRequired,
  returnToStart: PropTypes.func.isRequired,
};

export default class ConfirmWagerStep extends React.PureComponent {
  render() {
    const { cancelledByYou, returnToStart } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>
            {cancelledByYou
              ? 'You have cancelled the match'
              : 'Your opponent has cancelled the match'}
          </h1>
        </div>
        <Button onClick={returnToStart}>Return to Opponent Selection</Button>
      </div>
    );
  }
}

ConfirmWagerStep.propTypes = propTypes;
