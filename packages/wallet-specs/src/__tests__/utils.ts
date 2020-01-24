import * as xstate from 'xstate';

import { Process } from '../protocols/wallet/protocol';

import { pretty } from '..';

export const debugAction = (val?) => (ctx, event, { state }) => {
  // Trigger this action if you'd like to breakpoint on entry into some state, for instance.
  val; // Put a reference to some value in the action's closure
  debugger;
};

export function addLogs(
  _ctx,
  _event,
  { state: parentState }: { state: xstate.State<any, any, any> }
) {
  const supervisorState = parentState.value;
  Object.values(parentState.children).forEach((service: xstate.Interpreter<any, any, any>) => {
    service
      .onTransition(state =>
        console.log(
          pretty({
            supervisor: supervisorState,
            service: service.id,
            state: invokedState({ state } as any),
          })
        )
      )
      .onEvent(event => {
        console.log(
          pretty({
            supervisor: supervisorState,
            service: service.id,
            EVENT: { event: event.type },
          })
        );
      });
  });

  return process;
}

export function processStates(state): string {
  const vals = state.context.processes.map((p: Process) => {
    return [`  PROCESS: ${p.id}`]
      .concat([`  STATE: ${JSON.stringify(p.ref.state.value)}`])
      .concat(
        Object.values(p.ref.state.children).map(child => {
          return invokedState(child);
        })
      )
      .join('\n');
  });

  return `WALLET: ${state.context.id}\n${vals}`;
}
export function invokedState(actor: xstate.Actor, prefix = '    '): string {
  if (actor.state) {
    const childState = Object.values(actor.state.children).map((child: xstate.Actor) =>
      invokedState(child, prefix.concat('  '))
    );

    return [`${prefix}${JSON.stringify(actor.state.value)}\n`].concat(childState).join('\n');
  } else {
    return `${prefix}${actor.id}\n`;
  }
}
