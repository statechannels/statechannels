import debug from 'debug';
import React, {useEffect} from 'react';
import {RouteComponentProps} from 'react-router';
import {useOnboardingFlowContext} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {allocate, closeWallet} from '../../message-dispatchers';
import {Dialog, Icons} from '../../ui';

const log = debug('wallet:no-hub');

const backToApp = (onboardingFlowContext: JsonRpcComponentProps) => () => {
  log('Clicked on Back to app');
  log('Handing off to app');
  allocate(onboardingFlowContext.request.id, {
    done: true
  });
  closeWallet();
};

const OnboardingFinished: React.FC<RouteComponentProps> = () => {
  const onboardingFlowContext = useOnboardingFlowContext();

  useEffect(() => {
    log('Initiated flow step with request %o', onboardingFlowContext.request);
  }, [onboardingFlowContext.request]);

  return (
    <Dialog
      icon={Icons.Link}
      title="All set!"
      closable={false}
      buttons={{
        primary: {
          label: 'Back to App',
          onClick: backToApp(onboardingFlowContext)
        }
      }}
    >
      <p>
        You now have <strong>5 ETH</strong> in a channel with <strong>hub.com</strong>.
      </p>
      <p>You may now proceed to the app.</p>
    </Dialog>
  );
};

export {OnboardingFinished};
