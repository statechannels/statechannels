import React from 'react';
import PropTypes from 'prop-types';

import Button from './Button';

const propTypes = {
  wager: PropTypes.string.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  handleReject: PropTypes.func.isRequired,
};

export default class ConfirmWagerStep extends React.PureComponent {
  render() {
    const { wager, handleConfirm, handleReject } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Please confirm the below wager:</h1>
        </div>
        <div style={{ width: '100%' }}>
          {`${wager} Finney`}
        </div>
        <Button onClick={handleConfirm}>Confirm</Button>
        <Button onClick={handleReject}>Reject</Button>
      </div>
    );
  }
}

ConfirmWagerStep.propTypes = propTypes;
