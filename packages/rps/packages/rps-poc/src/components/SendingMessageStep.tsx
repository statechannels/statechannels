import React from 'react';
import { StyleSheet, css } from 'aphrodite';

export default function WaitForOpponent() {
  return (
    <div className={css(styles.container)}>
      <div>
        <h1>Sending move to opponent...</h1>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },
});
