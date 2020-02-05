import React from 'react';
import {Wallet} from '../wallet';
import {Image} from 'rimble-ui';
import fakeApp from '../../images/fake-app.png';

export function renderWalletInFrontOfApp(machine) {
  function renderFunction() {
    return (
      <div>
        <Image src={fakeApp} />
        <Wallet workflow={machine} />
      </div>
    );
  }
  return renderFunction;
}
