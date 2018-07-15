import React from 'react';

import Button from './Button';
import ButtonLink from './ButtonLink';
import { ROUTE_PATHS } from '../constants';

export function HomePage(props) {
  return (
    <div style={{ maxWidth: '90%', margin: 'auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 0 }}>Rock, Paper, Scissors</h1>
        <p><em>A State-Channel Proof-of-Concept Game</em></p>
      </div>
      <div>
        <div style={{ display: 'inline-block', maxWidth: '33%' }}>
          <img alt="rock" width="100%" src="https://i.imgur.com/4JnbeAm.png" />
        </div>
        <div style={{ display: 'inline-block', maxWidth: '33%' }}>
          <img
            alt="paper"
            width="100%"
            src="https://images.vexels.com/media/users/3/128601/isolated/preview/adea4e2cdcac05cab39a471f7cd7178d-red-rectangular-origami-banner-by-vexels.png"
          />
        </div>
        <div style={{ display: 'inline-block', maxWidth: '33%' }}>
          <img
            alt="scissors"
            width="100%"
            src="http://www.pngmart.com/files/1/Scissors-PNG-Free-Download.png"
          />
        </div>
      </div>
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <ButtonLink href={ROUTE_PATHS.HOW_IT_WORKS}>Begin</ButtonLink>
        <Button onClick={props.loginUser}>Login</Button>
      </div>
    </div>
  );
}

