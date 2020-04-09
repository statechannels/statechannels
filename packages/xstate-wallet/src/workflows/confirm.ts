import {MachineConfig, StateSchema, Machine, StateMachine, State} from 'xstate';

export type WorkflowContext = {};

interface WorkflowStateSchema extends StateSchema<WorkflowContext> {
  initial: 'waitForUserConfirmation';
  states: {
    waitForUserConfirmation: {};
    done: {};
    failure: {};
  };
}

export type StateValue = keyof WorkflowStateSchema['states'];

export type WorkflowState = State<WorkflowContext, WorkflowEvent, WorkflowStateSchema, any>;

interface UserApproves {
  type: 'USER_APPROVES';
}
interface UserRejects {
  type: 'USER_REJECTS';
}
type WorkflowEvent = UserApproves | UserRejects;

export const config: MachineConfig<WorkflowContext, WorkflowStateSchema, WorkflowEvent> = {
  id: 'confirm-create-channel',
  initial: 'waitForUserConfirmation',
  states: {
    waitForUserConfirmation: {on: {USER_APPROVES: 'done', USER_REJECTS: 'failure'}},
    done: {type: 'final', data: context => context},
    failure: {}
  }
};

export const workflow = (ctx: WorkflowContext): WorkflowMachine => Machine(config).withContext(ctx);
export type WorkflowMachine = StateMachine<WorkflowContext, any, WorkflowEvent, any>;
