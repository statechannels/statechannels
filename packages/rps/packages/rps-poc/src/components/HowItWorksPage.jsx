import React from 'react';

import ButtonLink from './ButtonLink';

import { ROUTE_PATHS } from '../constants';

export default function HomePage() {
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
              <h3>Step 1: blkeb ebwlkjb ekjwb lkwjeb</h3>
            </div>
            <div>
              <h3>Step 2: blkeb ebwlkjb ekjwb lkwjeb</h3>
            </div>
            <div>
              <h3>Step 3: blkeb ebwlkjb ekjwb lkwjeb</h3>
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
