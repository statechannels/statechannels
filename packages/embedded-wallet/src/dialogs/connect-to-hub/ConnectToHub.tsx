import debug from 'debug';
import React, {useContext, useEffect, useState} from 'react';
import {OnboardingFlowContext} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, FlowProcess, FlowStep, FlowStepProps, FlowStepStatus} from '../../ui';

const log = debug('wallet:connect-to-hub');

const ConnectToHub: React.FC<JsonRpcComponentProps> = () => {
  const [steps, setSteps] = useState<FlowStepProps[]>([
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
  ]);

  const onboardingFlowContext = useContext(OnboardingFlowContext);

  useEffect(() => {
    log('Initiated flow step with request %o', onboardingFlowContext.request);
  }, [onboardingFlowContext.request]);

  useEffect(() => {
    if (steps[steps.length - 1].status !== FlowStepStatus.Done) {
      setTimeout(() => {
        const newSteps = [...steps];
        const finishedStep = newSteps.findIndex(step => step.status === FlowStepStatus.InProgress);
        newSteps[finishedStep].status = FlowStepStatus.Done;
        log('step updated: %o', newSteps[finishedStep]);
        if (newSteps[finishedStep + 1]) {
          newSteps[finishedStep + 1].status = FlowStepStatus.InProgress;
        } else {
          setTimeout(() => closeWallet(), 1000);
        }
        setSteps(newSteps);
      }, 1000);
    }
  }, [steps]);

  return (
    <Dialog title="Connect to Hub" onClose={closeWallet}>
      <FlowProcess>
        {steps.map((step, index) => (
          <FlowStep key={`step${index}`} {...step} />
        ))}
      </FlowProcess>
    </Dialog>
  );
};

export {ConnectToHub};
