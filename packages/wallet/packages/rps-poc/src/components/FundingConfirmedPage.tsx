import React from 'react';
import { StyleSheet, css } from 'aphrodite';

interface Props {
  message: string;
}

export default class FundingConfirmedPage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <div className={css(styles.container)}>
        <div>
          <h1>Funding confirmed</h1>

          <div>{message}</div>
        </div>
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
