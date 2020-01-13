import React from 'react';
import {Events, Init} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
import {State} from 'xstate';
import styled from 'styled-components';

interface Props {
  currentProcess: string;
  currentState: State<Init, Events, any, any> | undefined;
}
const Wrapper = styled.section`
  padding: 4em;
  background: white;
  border-radius: 3px;
  height: 90%;
`;

export const Wallet = (props: Props) => {
  let currentState = 'no process';
  if (props.currentState) {
    currentState = props.currentState.value.toString();
  }
  return (
    <Wrapper>
      <div>
        <div>{props.currentProcess}</div>
        <div>{currentState}</div>
      </div>
    </Wrapper>
  );
};

export default Wallet;
