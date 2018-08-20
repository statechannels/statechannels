import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import Button from './Button';

interface IProps {
  cancelledByYou: boolean;
  returnToStart: () => any;
}

export default class ConfirmWagerStep extends React.PureComponent<IProps> {
  render() {
    const { cancelledByYou, returnToStart } = this.props;

    return (
      <div className={css(styles.container)}>
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

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },
});
