import {
  approveBudgetAndFundWorkflow,
  config,
  WorkflowContext
} from '../../workflows/approve-budget-and-fund';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';
import {MemoryStore} from '../../store/memory-store';
import {bigNumberify, parseEther} from 'ethers/utils';
import React from 'react';
import {ApproveBudgetAndFund} from '../approve-budget-and-fund-workflow';
import {SiteBudget, Participant} from '../../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../constants';
import {MessagingServiceInterface, MessagingService} from '../../messaging';

const store = new MemoryStore([
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29'
]);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const budget: SiteBudget = {
  site: 'rps.org',
  hubAddress: 'hub.com',
  forAsset: {
    [ETH_ASSET_HOLDER_ADDRESS]: {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      pending: {playerAmount: parseEther('5'), hubAmount: parseEther('5')},
      free: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
      inUse: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
      direct: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)}
    }
  }
};

const alice: Participant = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad' as any
};

const hub: Participant = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd' as any
};
const testContext: WorkflowContext = {
  budget,
  requestId: 55,
  player: alice,
  hub
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(
      approveBudgetAndFundWorkflow(store, messagingService, testContext).withContext(testContext),
      {
        devTools: true
      }
    ); // start a new interpreted machine for each story
    machine.onEvent(event => console.log(event.type)).start(state);
    storiesOf('Workflows / Approve Budget And Fund', module).add(
      state.toString(),
      renderComponentInFrontOfApp(
        <ApproveBudgetAndFund current={machine.state} send={machine.send} />
      )
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
  });
}
