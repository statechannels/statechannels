export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import React from 'react';

import {renderComponentInFrontOfApp} from './helpers';
import {MessagingServiceInterface, MessagingService} from '../../messaging';
import {ApplicationWorkflow} from '../application-workflow';
import {Store} from '../../store';
import {Application} from '../../workflows';

const store = new Store();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);
const testContext: Application.WorkflowContext = {
  channelId: '0x697ecf681033a2514ed19c90299a67ae8677f3c78b5877fe4550c4f0960e87b7',
  fundingStrategy: 'Direct',
  applicationDomain: 'localhost'
};

if (Application.config.states) {
  Object.keys(Application.config.states).forEach(state => {
    // TODO: We should figure out a nice way of dealing with nested workflows
    if (state !== 'confirmJoinChannelWorkflow' && state !== 'confirmCreateChannelWorkflow') {
      const machine = interpret<any, any, any>(
        Application.workflow(store, messagingService).withContext(testContext),
        {devTools: true}
      ); // start a new interpreted machine for each story
      machine.start(state);
      storiesOf('Workflows / Application', module).add(
        state.toString(),
        renderComponentInFrontOfApp(<ApplicationWorkflow current={machine.state} />)
      );
      machine.stop();
    }
  });
}
