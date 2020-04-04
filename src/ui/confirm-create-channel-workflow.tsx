import React from 'react';
import './wallet.scss';
import {Button} from 'rimble-ui';
import {useService} from '@xstate/react';
import {Interpreter} from 'xstate';

interface Props {
  service: Interpreter<any>;
}

export const ConfirmCreateChannel = (props: Props) => {
  const [current, send] = useService(props.service);
  const prompt = (
    <div style={{textAlign: 'center'}}>
      <h1>Do you wish to create a channel?</h1>
      <Button onClick={() => send('USER_APPROVES')}>Yes</Button>
      <Button.Text onClick={() => send('USER_REJECTS')}>No</Button.Text>
    </div>
  );
  if (current?.value.toString() === 'waitForUserConfirmation') {
    return prompt;
  } else {
    return <div></div>;
  }
};
