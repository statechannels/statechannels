import React from 'react';
import '../wallet.scss';
import {Button, Flex, Text as RimbleText} from 'rimble-ui';
import {useService} from '@xstate/react';
import {Interpreter} from 'xstate';

import {track} from '../../segment-analytics';

interface Props {
  service: Interpreter<any>;
}

export const ConfirmCreateChannel = (props: Props) => {
  const [current, _send] = useService(props.service);
  const send = (event: 'USER_APPROVES' | 'USER_REJECTS') => () => {
    track(event);
    _send(event);
  };

  const prompt = (
    <Flex alignItems="left" flexDirection="column">
      <RimbleText fontSize={2} pb={2}>
        Do you wish to create a channel?
      </RimbleText>
      <Button id="yes" onClick={send('USER_APPROVES')}>
        Yes
      </Button>
      <Button.Text onClick={send('USER_REJECTS')}>No</Button.Text>
    </Flex>
  );
  if (current?.value.toString() === 'waitForUserConfirmation') {
    return prompt;
  } else {
    return <div></div>;
  }
};
