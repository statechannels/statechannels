import React from 'react';
import { StyleSheet, css } from 'aphrodite';

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
      <div className={css(styles.container)}>
        <div>
          <h1>Please confirm the below wager:</h1>
        </div>
        <div className={css(styles.fullWidth)}>{`${wager} Finney`}</div>
        <Button onClick={handleConfirm}>Confirm</Button>
        <Button onClick={handleReject}>Reject</Button>
      </div>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },

  fullWidth: {
    width: '100%',
  },
});
