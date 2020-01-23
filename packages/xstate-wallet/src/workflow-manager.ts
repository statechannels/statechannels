import {Actor, Interpreter, interpret} from 'xstate';
import {IStore, ChannelUpdated} from '@statechannels/wallet-protocols/src/store';
import {
  CreateChannelEvent,
  OpenChannelEvent
} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {applicationWorkflow, ApplicationWorkflowEvent} from './workflows/application';
import {SendStates} from '@statechannels/wallet-protocols/src/wire-protocol';
import WalletUi from './ui/wallet';
import React from 'react';
import ReactDOM from 'react-dom';

// TODO: We should standardize logging with wallet-specs
function logState(actor, level = 0) {
  if (actor.state) {
    console.log(`${' '.repeat(level)}${JSON.stringify(actor.state.value)}`);
    Object.values(actor.state.children).map((child: Actor) => {
      logState(child, level + 2);
    });
  }
}

export type Event =
  | CreateChannelEvent
  | OpenChannelEvent
  | SendStates
  | ChannelUpdated
  | ApplicationWorkflowEvent;
export interface Workflow {
  machine: Interpreter<any, any, any>;
  domain: string; // TODO: Is this useful?
}

export class WorkflowManager {
  workflows: Workflow[];
  store: IStore;
  constructor(store: IStore) {
    this.workflows = [];
    this.store = store;
  }
  private renderWallet(machine) {
    ReactDOM.render(
      React.createElement(WalletUi, {workflow: machine}),
      document.getElementById('root')
    );
  }
  dispatchToWorkflows(event: Event) {
    if (event.type && (event.type === 'CREATE_CHANNEL' || event.type === 'OPEN_CHANNEL')) {
      const machine = interpret<any, any, any>(applicationWorkflow(this.store), {
        devTools: true
      })
        .onTransition(state => {
          logState({state});
        })
        .start();
      // TODO: Find a better place to do this
      this.renderWallet(machine);
      this.workflows.push({machine, domain: ''});
    }
    this.workflows.forEach(w => w.machine.send(event));
  }
}
