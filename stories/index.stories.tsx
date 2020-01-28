import React from 'react';
import Wallet from '../src/ui/wallet';
import {applicationWorkflow, config} from '../src/workflows/application';

export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';

import {interpret} from 'xstate';
import {Store} from '@statechannels/wallet-protocols';

const store = new Store({
  privateKeys: {
    ['0xaddress']: '0xkey'
  },
  ethAssetHolderAddress: '0xassetholder'
});

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(applicationWorkflow(store), {
      devTools: true
    }); // start a new interpreted machine for each story
    machine.start(state);
    storiesOf('Wallet', module).add(state.toString(), renderWalletInFrontOfApp(machine));
    machine.stop();
  });
}

function renderWalletInFrontOfApp(machine) {
  function renderFunction() {
    return (
      <div className={'app-in-background'}>
        <Wallet workflow={machine} />
      </div>
    );
  }
  return renderFunction;
}
