export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';

import React from 'react';
import {MessagingServiceInterface, MessagingService} from '../../messaging';
import {ethereumEnableWorkflow} from '../../workflows/ethereum-enable';
import {EnableEthereum} from '../enable-ethereum-workflow';
import {Store} from '@statechannels/wallet-core/lib/src/store';
import {WindowContext} from '../window-context';
import {logger} from '../../logger';

const store = new Store();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const testContext = {
  requestId: 55
};

const windowMetamaskOk = {ethereum: {networkVersion: process.env.CHAIN_NETWORK_ID}};
const windowNoMetamask = {};
const windowWrongNetwork = {ethereum: {networkVersion: 3}};

const storyOf = (state, window: any = windowMetamaskOk, name: any = undefined) => {
  name = name || state.toString();
  const machine = interpret<any, any, any>(
    ethereumEnableWorkflow(store, messagingService, testContext).withContext(testContext),
    {
      devTools: true
    }
  ); // start a new interpreted machine for each story
  machine.onEvent(event => logger.info(event.type)).start(state);
  storiesOf('Workflows / Enable Ethereum', module).add(
    name,
    renderComponentInFrontOfApp(
      <WindowContext.Provider value={window}>
        <EnableEthereum current={machine.state} send={machine.send} />
      </WindowContext.Provider>
    )
  );
  machine.stop(); // the machine will be stopped before it can be transitioned. This means the logger throws a warning that we sent an event to a stopped machine.
};

storyOf('explainToUser', windowNoMetamask, 'no metamask');
storyOf('explainToUser', windowWrongNetwork, ' wrong network');
storyOf('explainToUser');
storyOf('enabling');
storyOf('done');
storyOf('retry');
storyOf('failure');
