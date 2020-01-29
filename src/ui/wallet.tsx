import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import './wallet.scss';
import logo from '../images/logo.svg';
import {Modal, Card, Flex, Image} from 'rimble-ui';
import {ChannelId} from './channel-id';

interface Props {
  workflow: Interpreter<any, any, any>;
}

export const Wallet = (props: Props) => {
  const [current] = useService(props.workflow);
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
          <h1>{current.value}</h1>
          <ChannelId channelId={current.context.channelId} />
        </div>
      </Card>
    </Modal>
  );
};

export default Wallet;
