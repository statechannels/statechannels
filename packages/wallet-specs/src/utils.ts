import * as xstate from 'xstate';
import { pretty } from '.';

export function log(cond: boolean, message: string) {
  if (!cond) {
    console.log(message);
  }
}

export function addLogs(
  _ctx,
  _event,
  { state: parentState }: { state: xstate.State<any, any, any> }
) {
  const supervisorState = parentState.value;
  Object.values(parentState.children).forEach(
    (service: xstate.Interpreter<any, any, any>) => {
      service
        .onTransition(state =>
          console.log(
            pretty({
              supervisor: supervisorState,
              service: service.id,
              TRANSITION: { state: state.value },
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
    }
  );

  return process;
}
