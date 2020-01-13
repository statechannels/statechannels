import * as React from 'react';
import {Events, Init} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
import {State} from 'xstate';

interface Props {
  currentProcess: string;
  currentState: State<Init, Events, any, any> | undefined;
}

export const Wallet = (props: Props) => {
  let currentState = 'no process';
  if (props.currentState) {
    currentState = props.currentState.value.toString();
  }
  return (
    <div
      style={{
        padding: '4em',
        backgroundColor: 'white',
        borderRadius: 4,
        height: '90%'
      }}
    >
      <div>
        <div>{props.currentProcess}</div>
        <div>{currentState}</div>
      </div>
    </div>
  );
};

export default Wallet;
