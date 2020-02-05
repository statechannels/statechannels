import React from 'react';
import {Wallet} from '../wallet';
import {
  applicationWorkflow,
  config as applicationWorkflowConfig
} from '../../workflows/application';
import {ChannelId} from '../channel-id';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {Image} from 'rimble-ui';
import fakeApp from '../../images/fake-app.png';
import {interpret} from 'xstate';
import {EphemeralStore} from '@statechannels/wallet-protocols';

const store = new EphemeralStore({
  privateKeys: {
    ['0xaddress']: '0xkey'
  },
  ethAssetHolderAddress: '0xassetholder'
});

const testContext = {
  channelId: '0x697ecf681033a2514ed19c90299a67ae8677f3c78b5877fe4550c4f0960e87b7'
};

if (applicationWorkflowConfig.states) {
  Object.keys(applicationWorkflowConfig.states).forEach(state => {
    const machine = interpret<any, any, any>(applicationWorkflow(store).withContext(testContext), {
      devTools: true
    }); // start a new interpreted machine for each story
    machine.start(state);
    storiesOf('Application Workflow', module).add(
      state.toString(),
      renderWalletInFrontOfApp(machine)
    );
    machine.stop();
  });
}

function renderWalletInFrontOfApp(machine) {
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

storiesOf('ChannelId', module).add('empty', () => <ChannelId channelId={undefined} />);
storiesOf('ChannelId', module).add('not empty', () => (
  <ChannelId channelId={testContext.channelId} />
));

if (applicationWorkflowConfig.states) {
  ['CREATE_CHANNEL', 'OPEN_CHANNEL'].forEach(event => {
    const machineWithChildren = interpret<any, any, any>(
      applicationWorkflow(store).withContext(testContext)
    ).start(); // start a new interpreted machine for each story
    machineWithChildren.send(event);
    storiesOf('Wallet with invoked children', module).add(
      'Init + ' + event,
      renderWalletInFrontOfApp(machineWithChildren)
    );
    machineWithChildren.stop();
  });
}
