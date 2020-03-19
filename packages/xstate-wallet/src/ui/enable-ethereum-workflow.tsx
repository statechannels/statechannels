import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {Button} from 'rimble-ui';
import {WorkflowState} from '../workflows/approve-budget-and-fund';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const EnableEthereum = (props: Props) => {
  const current = props.current;

  const prompt = (
    <div
      style={{
        textAlign: 'center'
      }}
    >
      <h1>In order to proceed you must connect to MetaMask.</h1>
      <Button onClick={() => props.send('USER_APPROVES_ENABLE')}>Ok</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS_ENABLE')}>Cancel</Button.Text>
    </div>
  );
  if (current.value.toString() === 'explainToUser') {
    return prompt;
  } else {
    return <div></div>;
  }
};
