import React from 'react';
import './wallet.scss';
import {Flex, Heading, Progress} from 'rimble-ui';
import {ChannelId} from './channel-id';
import {
  isConfirmCreateChannel,
  getConfirmCreateChannelService,
  getChallengeChannelService,
  getApplicationOpenProgress,
  isApplicationOpening,
  getApplicationStateValue,
  isApplicationChallenging
} from './selectors';
import {ChallengeChannel} from './challenge-channel-workflow';
import {ConfirmCreateChannel} from './confirm-create-channel-workflow';
import {Application} from '../workflows';

interface Props {
  current: Application.WorkflowState;
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
    sendChallenge: 'Challenging channel...',
    closing: 'Closing channel...',
    done: 'Channel closed',
    failure: 'Something went wrong ...',
    fundingChannel: 'Funding channel ... '
  };
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
      className="application-workflow-prompt"
    >
      <div
        id={
          getApplicationStateValue(current) === 'joiningChannel' ? 'joiningChannel' : 'noPromptId'
        }
      />
      <Heading textAlign="center" mb={0}>
        {messages[getApplicationStateValue(current)]}
      </Heading>
      {!isConfirmCreateChannel(current) && !isApplicationChallenging(current) && (
        <Flex px={3} height={3} mt={'0.8'} mx={'0.4'}>
          <ChannelId channelId={current.context.channelId} />
        </Flex>
      )}
      {isConfirmCreateChannel(current) && (
        <ConfirmCreateChannel service={getConfirmCreateChannelService(current)} />
      )}
      {isApplicationChallenging(current) && (
        <ChallengeChannel service={getChallengeChannelService(current)} />
      )}
      {!isConfirmCreateChannel(current) && isApplicationOpening(current) && (
        <Progress value={getApplicationOpenProgress(current)} />
      )}
    </div>
  );
};

export default ApplicationWorkflow;
