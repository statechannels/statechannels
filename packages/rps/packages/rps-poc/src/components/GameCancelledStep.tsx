import React from 'react';

import Button from './Button';

interface IProps {
  cancelledByYou: boolean;
  returnToStart: () => any;
}

export default class ConfirmWagerStep extends React.PureComponent<IProps> {
  render() {
    const { cancelledByYou, returnToStart } = this.props;

    return (
      <React.Fragment>
        <div>
          <h1>
            {cancelledByYou
              ? 'You have cancelled the match'
              : 'Your opponent has cancelled the match'}
          </h1>
        </div>
        <Button onClick={returnToStart}>Return to Opponent Selection</Button>
      </React.Fragment>
    );
  }
}
