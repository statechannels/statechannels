import React from 'react';
import { StyleSheet, css } from 'aphrodite';

export default function About() {
  return (
    <div className={css(styles.container)}>
      <div>
        <h1>About this game</h1>
      </div>
      <div>
        <h2>Force-move games</h2>
        <p>blah blah</p>
        <h2>Magmo</h2>
        <p>blah blah</p>
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
