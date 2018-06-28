import React from 'react';

import Button from './Button';

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
