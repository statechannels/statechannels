import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {Button, MetaMaskButton} from 'rimble-ui';
import {WorkflowState} from '../workflows/approve-budget-and-fund';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const EnableEthereum = (props: Props) => {
  const current = props.current;

  const metaMaskButton = (disabled, message) => (
    <MetaMaskButton.Outline disabled={disabled} onClick={() => props.send('USER_APPROVES_ENABLE')}>
      {message}
    </MetaMaskButton.Outline>
  );

  const button = () => {
    switch (current.value.toString()) {
      case 'explainToUser':
      case 'retry':
        return metaMaskButton(false, 'Connect with MetaMask');
      case 'enabling':
        return metaMaskButton(true, 'Connecting..');
      case 'done':
        return metaMaskButton(true, 'Connected!');
      case 'failure':
        return metaMaskButton(true, 'Connection failed :(');
      default:
        return '';
    }
  };

  const prompt = (
    <div style={{textAlign: 'center'}}>
      <h1>Connect to Blockchain</h1>

      <p>
        This app uses state channels. It order to continue you need to connect to the blockchain.
      </p>

      <div>{button()}</div>
      <div>
        <Button.Text onClick={() => props.send('USER_REJECTS_ENABLE')}>Cancel</Button.Text>
      </div>
    </div>
  );
  return prompt;
};
