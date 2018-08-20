import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import ButtonLink from './ButtonLink';
import { ROUTE_PATHS } from '../constants';

const HowItWorksPage: React.SFC = () => {
  return (
    <div className={css(styles.container)}>
      <div>
        <h1>How it works</h1>
      </div>
      <div className={css(styles.fullWidth)}>
        <div className={css(styles.column)}>
          <div className={css(styles.rightPadding)}>
            <div>
              <h3>Step 1: Select an opponent</h3>
              <p>Choose an opponent by the amount of Finney you want to bet.</p>
            </div>
            <div>
              <h3>Step 2: Initiate a game</h3>
              <p>
                You and your opponent will lock up your funds in a state channel so that games can
                be played off-chain.
              </p>
            </div>
            <div>
              <h3>Step 3: Play Rock Paper Scissors!</h3>
              <p>
                There will be <em>five</em> rounds of Rock Paper Scissors, each one awarding a fifth
                of the locked-up funds.
              </p>
            </div>
            <div>
              <h3>Step 4: Settle up</h3>
              <p>
                After finishing all five rounds, you&apos;ll settle up and receive your earnings.
              </p>
            </div>
          </div>
        </div>
        <div className={css(styles.column)}>
          <div className={css(styles.image)}>*** gif or video of game goes here **</div>
        </div>
      </div>
      <div className={css(styles.link)}>
        <ButtonLink href={ROUTE_PATHS.PLAY}>Continue</ButtonLink>
      </div>
    </div>
  );
};

export default HowItWorksPage;

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },

  fullWidth: {
    width: '100%',
  },

  column: {
    display: 'inline-block',
    verticalAlign: 'top',
    width: '50%',
  },

  rightPadding: {
    paddingRight: 8,
  },

  image: {
    backgroundColor: 'antiquewhite',
    height: 350,
    width: '100%',
  },

  link: {
    textAlign: 'center',
    paddingTop: 40,
  },
});
