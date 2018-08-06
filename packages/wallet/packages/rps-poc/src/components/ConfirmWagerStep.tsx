import React from 'react';

import Button from './Button';

interface IProps {
  handleConfirm: () => any;
  handleReject: () => any;
  wager: string;
}

export default class ConfirmWagerStep extends React.PureComponent<IProps> {
  render() {
    const { handleConfirm, handleReject, wager } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Please confirm the below wager:</h1>
        </div>
        <div style={{ width: '100%' }}>{`${wager} Finney`}</div>
        <Button onClick={handleConfirm}>Confirm</Button>
        <Button onClick={handleReject}>Reject</Button>
      </div>
    );
  }
}
