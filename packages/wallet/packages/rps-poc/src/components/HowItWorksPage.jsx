import React from 'react';

import ButtonLink from './ButtonLink';
import { ROUTE_PATHS } from '../constants';

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: '90%', margin: 'auto' }}>
      <div>
        <h1>How it works</h1>
      </div>
      <div style={{ width: '100%' }}>
        <div
          style={{
            width: '50%',
            display: 'inline-block',
            verticalAlign: 'top',
          }}
        >
          <div style={{ paddingRight: 8 }}>
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
        <div style={{ width: '50%', display: 'inline-block' }}>
          <div
            style={{
              width: '100%',
              height: 350,
              backgroundColor: 'antiquewhite',
            }}
          >
            *** gif or video of game goes here **
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <ButtonLink href={ROUTE_PATHS.PLAY}>Continue</ButtonLink>
      </div>
    </div>
  );
}
