import {workflow, config, WorkflowContext} from '../../workflows/confirm';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {Participant} from '@statechannels/client-api-schema';
import {renderComponentInFrontOfApp} from './helpers';

import {simpleEthAllocation} from '../../utils';
import React from 'react';
import {ConfirmCreateChannel} from '../confirm-create-channel-workflow';
import {Store} from '../../store';
import {logger} from '../../logger';
import {BigNumber} from 'ethers';

const store = new Store();
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
  challengeDuration: BigNumber.from(1)
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(workflow(testContext).withContext(testContext), {
      devTools: true
    }); // start a new interpreted machine for each story
    machine.onEvent(event => logger.info(event.type)).start(state);
    storiesOf('Workflows / Confirm Create Channel', module).add(
      state.toString(),
      renderComponentInFrontOfApp(<ConfirmCreateChannel service={machine} />)
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the logger throws a warning that we sent an event to a stopped machine.
  });
}
