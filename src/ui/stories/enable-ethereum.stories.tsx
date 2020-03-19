export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';

import React from 'react';
import {MessagingServiceInterface, MessagingService} from '../../messaging';
import {ethereumEnableWorkflow, config} from '../../workflows/ethereum-enable';
import {EnableEthereum} from '../enable-ethereum-workflow';
import {XstateStore} from '../../store';

const store = new XstateStore();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const testContext = {
  requestId: 55
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(
      ethereumEnableWorkflow(store, messagingService, testContext).withContext(testContext),
      {
        devTools: true
      }
    ); // start a new interpreted machine for each story
    machine.onEvent(event => console.log(event.type)).start(state);
    storiesOf('Workflows / Enable Ethereum', module).add(
      state.toString(),
      renderComponentInFrontOfApp(<EnableEthereum current={machine.state} send={machine.send} />)
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
  });
}
