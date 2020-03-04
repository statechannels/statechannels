import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {Button} from 'rimble-ui';
import {WorkflowState} from '../workflows/confirm-create-channel';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const ConfirmCreateChannel = (props: Props) => {
  const current = props.current;
  const prompt = (
    <div
      style={{
        textAlign: 'center'
      }}
    >
      <h1>Do you wish to create a channel?</h1>
      <Button onClick={() => props.send('USER_APPROVES')}>Yes</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS')}>No</Button.Text>
    </div>
  );
  if (current.value.toString() === 'waitForUserConfirmation') {
    return prompt;
  } else {
    return <div></div>;
  }
};
