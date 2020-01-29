import React from 'react';
import Wallet from '../src/ui/wallet';
import {applicationWorkflow, config} from '../src/workflows/application';
import {ChannelId} from '../src/ui/channel-id';
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

const testContext = {
  channelId: '0x697ecf681033a2514ed19c90299a67ae8677f3c78b5877fe4550c4f0960e87b7'
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(applicationWorkflow(store).withContext(testContext), {
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

storiesOf('ChannelId', module).add('empty', () => <ChannelId channelId={undefined} />);
storiesOf('ChannelId', module).add('not empty', () => (
  <ChannelId channelId={testContext.channelId} />
));
