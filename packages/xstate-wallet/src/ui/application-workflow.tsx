import React from 'react';
import {State, EventData} from 'xstate';
import './wallet.scss';
import {Flex, Progress} from 'rimble-ui';
import {ChannelId} from './channel-id';
import {StateValue, WorkflowState} from '../workflows/application';
import {
  isConfirmCreateChannel,
  getConfirmCreateChannelState,
  getApplicationOpenProgress,
  isApplicationOpening,
  getApplicationStateValue
} from './selectors';
import {ConfirmCreateChannel} from './confirm-create-channel-workflow';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => State<any, any, any, any>;
}

export const ApplicationWorkflow = (props: Props) => {
  const current = props.current;
  const messages: Record<StateValue, string> = {
    initializing: 'Initializing...',
    confirmCreateChannelWorkflow: 'Creating channel...',
    createChannelInStore: 'Creating channel...',
    confirmJoinChannelWorkflow: 'Joining channel ... ',
    openChannelAndFundProtocol: 'Opening channel...',
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
      <h1>{messages[getApplicationStateValue(current)]}</h1>
      {!isConfirmCreateChannel(current) && (
        <Flex px={3} height={3} mt={'0.8'} mx={'0.4'}>
          <ChannelId channelId={current.context.channelId} />
        </Flex>
      )}
      {isConfirmCreateChannel(current) && (
        <ConfirmCreateChannel current={getConfirmCreateChannelState(current)} send={props.send} />
      )}
      {!isConfirmCreateChannel(current) && isApplicationOpening(current) && (
        <Progress value={getApplicationOpenProgress(current)} />
      )}
    </div>
  );
};

export default ApplicationWorkflow;
