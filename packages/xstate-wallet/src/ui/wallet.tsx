import * as React from 'react';
import {Interpreter} from 'xstate';
import {useService, useMachine} from '@xstate/react';
import {WorkflowManager} from '../workflow-manager';
interface Props {
  workflow: Interpreter<any, any, any>;
}
export const Wallet = (props: Props) => {
  // TODO: Use @xstate/react
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
    >
      <div>{props.workflow.state.value}</div>
    </div>
  );
};

export default Wallet;
