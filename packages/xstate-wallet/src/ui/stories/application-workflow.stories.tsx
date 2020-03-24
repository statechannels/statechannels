import {
  applicationWorkflow,
  config as applicationWorkflowConfig
} from '../../workflows/application';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';

import {MessagingServiceInterface, MessagingService} from '../../messaging';
import React from 'react';
import {ApplicationWorkflow} from '../application-workflow';
import {XstateStore} from '../../store';

const store = new XstateStore();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);
const testContext = {
  channelId: '0x697ecf681033a2514ed19c90299a67ae8677f3c78b5877fe4550c4f0960e87b7'
};

if (applicationWorkflowConfig.states) {
  Object.keys(applicationWorkflowConfig.states).forEach(state => {
    // TODO: We should figure out a nice way of dealing with nested workflows
    if (state !== 'confirmJoinChannelWorkflow' && state !== 'confirmCreateChannelWorkflow') {
      const machine = interpret<any, any, any>(
        applicationWorkflow(store, messagingService).withContext(testContext),
        {
          devTools: true
        }
      ); // start a new interpreted machine for each story
      machine.start(state);
      storiesOf('Workflows / Application', module).add(
        state.toString(),
        renderComponentInFrontOfApp(
          <ApplicationWorkflow current={machine.state} send={machine.send} />
        )
      );
      machine.stop();
    }
  });
}
