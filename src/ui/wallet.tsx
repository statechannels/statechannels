import * as React from 'react';
import {Interpreter} from 'xstate';
import {useService, useMachine} from '@xstate/react';
import {WorkflowManager} from '../workflow-manager';
interface Props {
  workflow: Interpreter<any, any, any>;
}
export const Wallet = (props: Props) => {
  const [current, send] = useService(props.workflow);
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
    >
      <div>{current.value}</div>
    </div>
  );
};

export default Wallet;
