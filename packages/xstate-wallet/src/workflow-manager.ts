import {Actor, Interpreter, interpret} from 'xstate';
import {IStore, ChannelUpdated} from '@statechannels/wallet-protocols/src/store';
import {
  CreateChannelEvent,
  OpenChannelEvent
} from '@statechannels/wallet-protocols/src/protocols/wallet/protocol';
import {applicationWorkflow, ApplicationWorkflowEvent} from './workflows/application';
import {SendStates} from '@statechannels/wallet-protocols/src/wire-protocol';

// TODO: We should standardize logging with wallet-specs
function logState(actor, level = 0) {
  if (actor.state) {
    console.log(`${' '.repeat(level)}${JSON.stringify(actor.state.value)}`);
    Object.values(actor.state.children).map((child: Actor) => {
      logState(child, level + 2);
    });
  }
}

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

  dispatchToWorkflows(
    event:
      | CreateChannelEvent
      | OpenChannelEvent
      | SendStates
      | ChannelUpdated
      | ApplicationWorkflowEvent
  ) {
    if (event.type && (event.type === 'CREATE_CHANNEL' || event.type === 'OPEN_CHANNEL')) {
      const machine = interpret<any, any, any>(applicationWorkflow(this.store), {
        devTools: true
      })
        .onTransition(state => {
          logState({state});
        })
        .start();
      this.workflows.push({machine, domain: ''});
    }
    this.workflows.forEach(w => w.machine.send(event));
  }
}
