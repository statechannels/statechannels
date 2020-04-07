import React from 'react';
import {State, EventData} from 'xstate';
import './wallet.scss';
import {Flex, Progress} from 'rimble-ui';
import {ChannelId} from './channel-id';
import {
  isConfirmCreateChannel,
  getConfirmCreateChannelService,
  getApplicationOpenProgress,
  isApplicationOpening,
  getApplicationStateValue
} from './selectors';
import {ConfirmCreateChannel} from './confirm-create-channel-workflow';
import {Application} from '../workflows';

interface Props {
  current: Application.WorkflowState;
  send: (event: any, payload?: EventData | undefined) => State<any, any, any, any>;
}

export const ApplicationWorkflow = (props: Props) => {
  const current = props.current;
  const messages: Record<Application.StateValue, string> = {
    branchingOnFundingStrategy: '', // UI never sees this state
    confirmingWithUser: 'Confirming with user...',
    creatingChannel: 'Creating channel...',
    joiningChannel: 'Joining channel ... ',
    openChannelAndFundProtocol: 'Opening channel...',
    running: 'Running channel...',
    closing: 'Closing channel...',
    done: 'Channel closed',
    failure: 'Something went wrong ...'
  };
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
      className="application-workflow-prompt"
    >
      <h1>{messages[getApplicationStateValue(current)]}</h1>
      {!isConfirmCreateChannel(current) && (
        <Flex px={3} height={3} mt={'0.8'} mx={'0.4'}>
          <ChannelId channelId={current.context.channelId} />
        </Flex>
      )}
      {isConfirmCreateChannel(current) && (
        <ConfirmCreateChannel service={getConfirmCreateChannelService(current)} />
      )}
      {!isConfirmCreateChannel(current) && isApplicationOpening(current) && (
        <Progress value={getApplicationOpenProgress(current)} />
      )}
    </div>
  );
};

export default ApplicationWorkflow;
