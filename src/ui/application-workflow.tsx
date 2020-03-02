import React from 'react';
import {State} from 'xstate';
import './wallet.scss';
import {Flex, Progress} from 'rimble-ui';
import {ChannelId} from './channel-id';

interface Props {
  current: State<any, any, any, any>;
}

export const ApplicationWorkflow = (props: Props) => {
  const current = props.current;
  const messages = {
    // TODO this lookup could be typed using Record<StateSchema,string> if/when we use StateSchema to type the underlying machine config
    initializing: 'Initializing...',
    join: 'Joining channel...',
    opening: 'Opening channel...',
    create: 'Creating channel...',
    running: 'Running channel...',
    closing: 'Closing channel...',
    done: 'Channel closed'
  };
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
    >
      <h1>{messages[current.value.toString()]}</h1>
      <Flex px={3} height={3} mt={'0.8'} mx={'0.4'}>
        <ChannelId channelId={current.context.channelId} />
      </Flex>
      {current.children &&
        current.children.createMachine &&
        current.children.createMachine.state && (
          <Progress
            value={progressThroughCreateMachine[current.children.createMachine.state.value]}
          />
        )}
      {current.children && current.children.joinMachine && current.children.joinMachine.state && (
        <Progress value={progressThroughJoinMachine[current.children.joinMachine.state.value]} />
      )}
    </div>
  );
};

const progressThroughCreateMachine = {
  initializeChannel: 0.15,
  sendOpenChannelMessage: 0.3,
  preFundSetup: 0.45,
  funding: 0.6,
  postFundSetup: 0.75,
  success: 0.9
};

const progressThroughJoinMachine = {
  checkNonce: 0.15,
  askClient: 0.3,
  preFundSetup: 0.45,
  funding: 0.6,
  postFundSetup: 0.75,
  success: 0.9
};
