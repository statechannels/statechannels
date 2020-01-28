import {Actor, Interpreter, interpret} from 'xstate';
import {
  Store,
  ChannelUpdated,
  CreateChannelEvent,
  OpenChannelEvent,
  SendStates
} from '@statechannels/wallet-protocols';

import {applicationWorkflow, ApplicationWorkflowEvent} from './workflows/application';
import {Guid} from 'guid-typescript';
import WalletUi from './ui/wallet';
import React from 'react';
import ReactDOM from 'react-dom';

// TODO: We should standardize logging with wallet-protocols
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
  id: string;
  machine: Interpreter<any, any, any>;
  domain: string; // TODO: Is this useful?
}

export class WorkflowManager {
  workflows: Workflow[];
  store: Store;
  tempMachine;
  constructor(store: Store) {
    this.workflows = [];
    this.store = store;
  }

  private renderUI(machine) {
    ReactDOM.render(
      React.createElement(WalletUi, {workflow: machine}),
      document.getElementById('root')
    );
  }

  private startWorkflow(event: Event): void {
    const id = Guid.create().toString();
    const machine = interpret<any, any, any>(applicationWorkflow(this.store), {
      devTools: true
    })
      .onTransition(state => {
        logState({state});
        console.log(JSON.stringify(state.context));
      })
      .onEvent(console.log)
      .onDone(() => (this.workflows = this.workflows.filter(w => w.id !== id)))
      .start();
    // TODO: Figure out how to resolve rendering priorities
    this.renderUI(machine);
    // Register for ChannelUpdated events
    this.store.on('CHANNEL_UPDATED', (event: ChannelUpdated) => machine.send(event));
    this.workflows.push({id, machine, domain: 'TODO'});
  }

  dispatchToWorkflows(event: Event) {
    if (event.type && (event.type === 'CREATE_CHANNEL' || event.type === 'OPEN_CHANNEL')) {
      this.startWorkflow(event);
    }

    this.workflows.forEach(w => w.machine.send(event));
  }
}
