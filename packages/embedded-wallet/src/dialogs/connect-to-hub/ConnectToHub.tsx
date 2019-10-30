import debug from 'debug';
import React, {useEffect, useState} from 'react';
import {Redirect, RouteComponentProps} from 'react-router';
import {OnboardingFlowPaths, useOnboardingFlowContext} from '../../flows';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, FlowProcess, FlowStep, FlowStepProps, FlowStepStatus} from '../../ui';

const log = debug('wallet:connect-to-hub');

export type ConnectToHubProps = RouteComponentProps & {
  onStepsDone?: () => void;
};

export const FlowSteps: FlowStepProps[] = [
  {
    title: 'Deposit 5 ETH',
    status: FlowStepStatus.InProgress
  },
  {
    title: 'Wait for TX to mine',
    status: FlowStepStatus.Pending
  },
  {
    title: 'Wait for hub.com',
    status: FlowStepStatus.Pending
  },
  {
    title: 'Done!',
    status: FlowStepStatus.Pending
  }
];

const ConnectToHub: React.FC<ConnectToHubProps> = ({onStepsDone}) => {
  const [steps, setSteps] = useState<FlowStepProps[]>(FlowSteps);

  const onboardingFlowContext = useOnboardingFlowContext();

  useEffect(() => {
    log('Initiated flow step with request %o', onboardingFlowContext.request);
  }, [onboardingFlowContext.request]);

  useEffect(() => {
    if (onStepsDone && steps.every(step => step.status === FlowStepStatus.Done)) {
      onStepsDone();
    }
  }, [steps, onStepsDone]);

  useEffect(() => {
    if (steps[steps.length - 1].status !== FlowStepStatus.Done) {
      setTimeout(() => {
        const newSteps = [...steps];
        const finishedStep = newSteps.findIndex(step => step.status === FlowStepStatus.InProgress);
        if (finishedStep >= 0) {
          newSteps[finishedStep].status = FlowStepStatus.Done;
          log('step updated: %o', newSteps[finishedStep]);
          if (newSteps[finishedStep + 1]) {
            newSteps[finishedStep + 1].status = FlowStepStatus.InProgress;
          }
          setSteps(newSteps);
        }
      }, 1000);
    }
  }, [steps, onboardingFlowContext.request.id]);

  return (
    <Dialog title="Connect to Hub" onClose={closeWallet}>
      {steps.every(step => step.status === FlowStepStatus.Done) && (
        <Redirect to={OnboardingFlowPaths.Finished} />
      )}
      <FlowProcess>
        {steps.map((step, index) => (
          <FlowStep key={`step${index}`} {...step} />
        ))}
      </FlowProcess>
    </Dialog>
  );
};

export {ConnectToHub};
