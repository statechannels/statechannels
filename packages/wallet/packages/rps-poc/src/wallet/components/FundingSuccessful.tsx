import React from 'react';
import { StyleSheet, css } from 'aphrodite';

interface Props {
  message: string;
}

export default class FundingSuccessful extends React.PureComponent<Props> {
  render() {
    return (
      <div>
        <h1>Funding successful!</h1>
        <p>
          <span className={css(styles.large)}>🎉</span>
        </p>
        <button>Return to app</button>
      </div>
    );
  }
}

const styles = StyleSheet.create({
  large: {
    fontSize: '4em',
  },
});
