import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import './wallet.scss';
import logo from '../images/logo.svg';
import {Modal, Card, Flex, Blockie} from 'rimble-ui';

interface Props {
  workflow: Interpreter<any, any, any>;
}
export const Wallet = (props: Props) => {
  const [current] = useService(props.workflow);
  return (
    <Modal isOpen={true}>
      <Card width={'320px'} height={'450px'} p={2} boxShadow={4}>
        <Flex px={[3, 3, 4]} height={3} borderBottom={1} borderColor={'#E8E8E8'} mt={'0.8'}>
          <img className="p-3" width="150" src={logo} />
        </Flex>
        <div
          style={{
            paddingTop: '50px',
            textAlign: 'center'
          }}
        >
          <h1>{current.value}</h1>
          <Blockie // TODO extend this class to make a visual rep of a channelId (which is longer than an ethereum address anyway)
            opts={{
              seed: current.context.channelId,
              color: '#dfe',
              bgcolor: '#a71',
              size: 15,
              scale: 3,
              spotcolor: '#000',
              borderRadius: 5
            }}
          />
        </div>
      </Card>
    </Modal>
  );
};

export default Wallet;
