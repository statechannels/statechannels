import React, {useContext} from 'react';
import {Sender} from 'xstate';
import './wallet.scss';
import {
  Button,
  Box,
  Flex,
  Icon,
  Text as RimbleText,
  MetaMaskButton,
  Flash,
  Heading
} from 'rimble-ui';
// eslint-disable-next-line import/no-unresolved
import ConnectionBanner from '@rimble/connection-banner';
// eslint-disable-next-line import/no-unresolved
import RimbleUtils from '@rimble/utils';

import {WorkflowState} from '../workflows/ethereum-enable';
import {CHAIN_NETWORK_ID} from '../config';
import {track} from '../segment-analytics';

import {WindowContext} from './window-context';

interface Props {
  current: WorkflowState;
  send: Sender<any>;
}

export const EnableEthereum = (props: Props) => {
  const {current: currentState, send: _send} = props;
  const send = (event: 'USER_APPROVES_ENABLE' | 'USER_REJECTS_ENABLE') => () => {
    track(event, {enabledAddress: currentState.context.enabledAddress});
    _send(event);
  };

  const targetNetwork = Number(CHAIN_NETWORK_ID);

  const window = useContext(WindowContext);
  const networkVersion = window?.ethereum?.networkVersion;
  const currentNetwork = networkVersion && Number(networkVersion);

  const metaMaskButton = (disabled, message) => (
    <MetaMaskButton.Outline
      disabled={disabled}
      id="connect-with-metamask-button"
      onClick={send('USER_APPROVES_ENABLE')}
    >
      {message}
    </MetaMaskButton.Outline>
  );

  const NoNetwork = () => (
    <div>
      <Flash variant={'danger'}>
        <Flex alignItems="center" justifyContent="space-between" flexDirection="column">
          <Flex alignItems="center" pb={3} flexDirection="column">
            <Box>
              <Icon name="Warning" size="44" />
            </Box>
            <Flex flexDirection="column">
              <RimbleText fontWeight="bold" color={'inherit'} textAlign="center">
                Install the MetaMask browser extension to use our blockchain features in your
                current browser
              </RimbleText>
            </Flex>
          </Flex>

          <MetaMaskButton as="a" href="https://metamask.io/" target="_blank" color={'white'}>
            Install MetaMask
          </MetaMaskButton>
        </Flex>
      </Flash>
    </div>
  );

  const WrongNetwork = () => (
    <div>
      <Flash variant={'danger'}>
        <Flex alignItems="center" flexDirection="column">
          <Box>
            <Icon name="Warning" size="44" />
          </Box>
          <Flex flexDirection="column">
            <RimbleText fontWeight="bold" color={'inherit'} textAlign="center" pb={3}>
              Switch to the {RimbleUtils.getEthNetworkNameById(targetNetwork)} network in MetaMask
            </RimbleText>
            <RimbleText color={'inherit'} textAlign="center">
              To use our blockchain features, you need to be on the{' '}
              {RimbleUtils.getEthNetworkNameById(targetNetwork)} network. You are currently on{' '}
              {RimbleUtils.getEthNetworkNameById(currentNetwork)}.
            </RimbleText>
          </Flex>
        </Flex>
      </Flash>
    </div>
  );

  const NotWeb3Browser = () => (
    <div>
      <Flash variant={'danger'}>
        <Flex alignItems="center" flexDirection="column">
          <Box>
            <Icon name="Warning" size="44" />
          </Box>
          <Flex flexDirection="column">
            <RimbleText fontWeight="bold" color={'inherit'}>
              Your browser does not support our blockchain features
            </RimbleText>
            {RimbleUtils.isMobileDevice() ? (
              <RimbleText color={'inherit'}>
                Try a mobile wallet browser like Status, Coinbase wallet or Cipher
              </RimbleText>
            ) : (
              <RimbleText color={'inherit'}>
                Switch to either Brave, FireFox, Opera, or Chrome to continue
              </RimbleText>
            )}
          </Flex>
        </Flex>
      </Flash>
    </div>
  );

  const button = () => {
    switch (currentState.value.toString()) {
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

  const connectionBanner = (
    <ConnectionBanner currentNetwork={currentNetwork} requiredNetwork={targetNetwork}>
      {{
        notWeb3CapableBrowserMessage: <NotWeb3Browser />,
        noNetworkAvailableMessage: <NoNetwork />,
        onWrongNetworkMessage: <WrongNetwork />
      }}
    </ConnectionBanner>
  );

  const prompt = (
    <Flex flexDirection="column" alignItems="center">
      <Heading>Connect to Blockchain</Heading>

      <RimbleText pb={3}>
        This app uses state channels. It order to continue you need to connect to the blockchain.
      </RimbleText>

      <div>{button()}</div>
      <div>
        <Button.Text onClick={send('USER_REJECTS_ENABLE')}>Cancel</Button.Text>
      </div>
    </Flex>
  );

  // need currentNetwork to be defined, and equal to the targetNetwork
  return currentNetwork === targetNetwork ? (
    prompt
  ) : (
    <div style={{paddingTop: '10px'}}>{connectionBanner}</div>
  );
};
