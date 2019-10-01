import debug from 'debug';
import React from 'react';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, Icons} from '../../ui';

const log = debug('wallet:no-hub');

const connectToHub = () => {
  log('Clicked on Connect To Hub');
};

const NoHub: React.FC<JsonRpcComponentProps> = () => {
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
          onClick: connectToHub
        }
      }}
    />
  );
};

export {NoHub};
