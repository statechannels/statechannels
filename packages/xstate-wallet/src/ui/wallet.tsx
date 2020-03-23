import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import './wallet.scss';
import logo from '../images/logo.svg';
import {Modal, Card, Flex, Image} from 'rimble-ui';
import {ApplicationWorkflow} from './application-workflow';
import {EnableEthereum} from './enable-ethereum-workflow';
import {WindowContext} from './window-context';

interface Props {
  workflow: Interpreter<any, any, any>;
}

export const Wallet = (props: Props) => {
  const [current, send] = useService(props.workflow);
  return (
    <Modal isOpen={true}>
      <WindowContext.Provider value={window}>
        <Card width={'320px'} height={'450px'}>
          <Flex px={[3, 3, 4]} height={3} borderBottom={1} borderColor={'#E8E8E8'} mt={'0.8'}>
            <Image alt="State Channels" borderRadius={8} height="auto" src={logo} />
          </Flex>
          {props.workflow.id === 'application-workflow' && (
            <ApplicationWorkflow current={current} send={send} />
          )}
          {props.workflow.id === 'enable-ethereum' && (
            <EnableEthereum current={current} send={send} />
          )}
        </Card>
      </WindowContext.Provider>
    </Modal>
  );
};
