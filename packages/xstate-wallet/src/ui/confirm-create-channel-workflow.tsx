import React from 'react';
import {State, EventData} from 'xstate';
import './wallet.scss';
import {Button} from 'rimble-ui';

interface Props {
  current: State<any, any, any, any>;
  send: (event: any, payload?: EventData | undefined) => State<any, any, any, any>;
}

export const ConfirmCreateChannel = (props: Props) => {
  const current = props.current;
  const prompt = (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
    >
      <h1>Do you wish to create a channel?</h1>
      <Button onClick={() => props.send('USER_APPROVED')}>Yes</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS')}>No</Button.Text>
    </div>
  );
  if (current.value.toString() === 'waitForUserConfirmation') {
    return prompt;
  } else {
    return <div></div>;
  }
};
