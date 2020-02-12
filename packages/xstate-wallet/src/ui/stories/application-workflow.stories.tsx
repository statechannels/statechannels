import {
  applicationWorkflow,
  config as applicationWorkflowConfig
} from '../../workflows/application';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {EphemeralObsoleteStore} from '@statechannels/wallet-protocols';
import {renderWalletInFrontOfApp} from './helpers';

const store = new EphemeralObsoleteStore({
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
    storiesOf('Workflows / Application', module).add(
      state.toString(),
      renderWalletInFrontOfApp(machine)
    );
    machine.stop();
  });
}

if (applicationWorkflowConfig.states) {
  ['CREATE_CHANNEL', 'OPEN_CHANNEL'].forEach(event => {
    const machineWithChildren = interpret<any, any, any>(
      applicationWorkflow(store).withContext(testContext)
    ).start(); // start a new interpreted machine for each story
    machineWithChildren.send(event);
    storiesOf('Workflows / Application', module).add(
      'Initialising + ' + event,
      renderWalletInFrontOfApp(machineWithChildren)
    );
    machineWithChildren.stop();
  });
}
