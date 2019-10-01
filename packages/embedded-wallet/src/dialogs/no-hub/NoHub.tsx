import debug from 'debug';
import React, {Dispatch, SetStateAction, useContext, useEffect, useState} from 'react';
import {Redirect} from 'react-router';
import {OnboardingFlowContext, OnboardingFlowPaths} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, Icons} from '../../ui';

const log = debug('wallet:no-hub');

const connectToHub = (useRedirect: Dispatch<SetStateAction<boolean>>) => () => {
  log('Clicked on Connect To Hub');
  log('Handing off to ConnectToHub');
  useRedirect(true);
};

const NoHub: React.FC<JsonRpcComponentProps> = () => {
  const [redirect, useRedirect] = useState<boolean>(false);

  const onboardingFlowContext = useContext(OnboardingFlowContext);

  useEffect(() => {
    log('Initiated flow step with request %o', onboardingFlowContext.request);
  }, [onboardingFlowContext.request]);

  return (
    <Dialog
      icon={Icons.Link}
      title="You aren't connected to any hubs, so connect to one."
      onClose={closeWallet}
      buttons={{
        primary: {
          icon: Icons.ExternalLink,
          label: 'Connect to Hub',
          iconPosition: 'right',
          onClick: connectToHub(useRedirect)
        }
      }}
    >
      {redirect ? <Redirect to={OnboardingFlowPaths.ConnectToHub} /> : []}
    </Dialog>
  );
};

export {NoHub};
