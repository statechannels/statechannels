import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import './wallet.scss';
import logo from '../images/logo.svg';
import {Modal, Card, Flex, Image, Progress} from 'rimble-ui';
import {ChannelId} from './channel-id';

interface Props {
  workflow: Interpreter<any, any, any>;
}

export const Wallet = (props: Props) => {
  const [current] = useService(props.workflow);
  const messages = {
    initializing: 'Initializing...',
    join: 'Joining channel...',
    opening: 'Opening channel...',
    create: 'Creating channel...',
    running: 'Running channel...',
    closing: 'Closing channel...',
    done: 'Channel closed'
  };
  return (
    <Modal isOpen={true}>
      <Card width={'320px'} height={'450px'}>
        <Flex px={[3, 3, 4]} height={3} borderBottom={1} borderColor={'#E8E8E8'} mt={'0.8'}>
          <Image alt="State Channels" borderRadius={8} height="auto" src={logo} />
        </Flex>
        <div
          style={{
            paddingTop: '50px',
            textAlign: 'center'
          }}
        >
          <h1>{messages[current.value.toString()]}</h1>
          <Flex px={3} height={3} mt={'0.8'} mx={'0.4'}>
            <ChannelId channelId={current.context.channelId} />
          </Flex>
          {/* {JSON.stringify(current.children.createMachine.state)} */}
          {current.children &&
            current.children.createMachine &&
            current.children.createMachine.state && (
              <Progress
                value={progressThroughCreateMachine[current.children.createMachine.state.value]}
              />
            )}
          {current.children &&
            current.children.joinMachine &&
            current.children.joinMachine.state && (
              <Progress
                value={progressThroughJoinMachine[current.children.joinMachine.state.value]}
              />
            )}
        </div>
      </Card>
    </Modal>
  );
};

export default Wallet;

const progressThroughCreateMachine = {
  initializeChannel: 0.15,
  sendOpenChannelMessage: 0.3,
  preFundSetup: 0.45,
  funding: 0.6,
  postFundSetup: 0.75,
  success: 0.9
};

const progressThroughJoinMachine = {
  checkNonce: 0.15,
  askClient: 0.3,
  preFundSetup: 0.45,
  funding: 0.6,
  postFundSetup: 0.75,
  success: 0.9
};
