import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';

interface Props {
  workflow: Interpreter<any, any, any>;
}
export const Wallet = (props: Props) => {
  const [current] = useService(props.workflow);
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
