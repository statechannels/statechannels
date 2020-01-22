import {handleMessage, sendMessage, dispatchChannelUpdatedMessage} from './messaging';

import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {ethers} from 'ethers';
import {Store} from './storage/store';
import {interpret, Interpreter, Actor} from 'xstate';
import {ChainWatcher} from './chain';
import {CreateChannelEvent} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {OpenChannelEvent} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
import {applicationWorkflow} from './workflows/application.workflow';
import {getChannelId} from '@statechannels/wallet-protocols';
import {ChannelUpdated} from '@statechannels/wallet-protocols/src/store';
export interface Workflow {
  machine: Interpreter<any, any, any>;
  domain: string;
}

export function logState(actor: any, level = 0) {
  if (actor.state) {
    console.log(`${' '.repeat(level)}${JSON.stringify(actor.state.value)}`);
    Object.values(actor.state.children).map((child: Actor) => {
      logState(child, level + 2);
    });
  }
}
export class WorkflowManager {
  constructor(store: IStore) {
    this.workflows = [];
    this.store = store;
  }
  workflows: Workflow[];
  store: IStore;
  dispatchToWorkflows(event: CreateChannelEvent | OpenChannelEvent | any) {
    if (event.type && (event.type === 'CREATE_CHANNEL' || event.type === 'OPEN_CHANNEL')) {
      const machine = interpret<any, any, any>(applicationWorkflow(this.store), {
        devTools: true
      })
        .onTransition(state => {
          logState({state});
        })
        .start();
      this.workflows.push({machine, domain: ''});

      // If it is a SendState from the opponent we have to
      // transform it into a ChannelUpdated and update the store
      // TODO: Figure out the best place to do this
    } else if (event.type && event.type === 'SendStates') {
      this.store.receiveStates(event.signedStates);
      const channelId = getChannelId(event.signedStates[0].state.channel);
      event = {
        type: 'CHANNEL_UPDATED',
        channelId
      };
    }
    this.workflows.forEach(w => w.machine.send(event));
  }
}

const ourWallet = ethers.Wallet.createRandom();

const chain = new ChainWatcher();

const store: IStore = new Store({
  chain,
  privateKeys: {
    [ourWallet.address]: ourWallet.privateKey
  },
  messageSender: sendMessage,
  channelUpdateListener: dispatchChannelUpdatedMessage
});
const workflowManager = new WorkflowManager(store);

window.addEventListener('message', async event => {
  await handleMessage(event, workflowManager, store, ourWallet);
});
