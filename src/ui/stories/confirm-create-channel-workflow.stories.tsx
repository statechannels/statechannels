import {workflow, config, WorkflowContext} from '../../workflows/confirm';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {Participant} from '@statechannels/client-api-schema';
import {renderComponentInFrontOfApp} from './helpers';

import {bigNumberify} from 'ethers/utils';
import {simpleEthAllocation} from '../../utils';
import React from 'react';
import {ConfirmCreateChannel} from '../confirm-create-channel-workflow';
import {XstateStore} from '../../store';

const store = new XstateStore();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);

const alice: Participant = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad'
};

const bob: Participant = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd'
};

const testContext: WorkflowContext = {
  participants: [alice, bob],
  outcome: simpleEthAllocation([]),
  appDefinition: '0x0',
  appData: '0x0',
  chainId: '0',
  challengeDuration: bigNumberify(1)
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(workflow(testContext).withContext(testContext), {
      devTools: true
    }); // start a new interpreted machine for each story
    machine.onEvent(event => console.log(event.type)).start(state);
    storiesOf('Workflows / Confirm Create Channel', module).add(
      state.toString(),
      renderComponentInFrontOfApp(
        <ConfirmCreateChannel current={machine.state} send={machine.send} />
      )
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
  });
}
