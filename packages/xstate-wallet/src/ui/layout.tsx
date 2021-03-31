import React, {FunctionComponent} from 'react';
import {ThemeProvider} from 'styled-components';
import {Modal, Card, Flex, Image as RimbleImage} from 'rimble-ui';

import logo from '../images/logo.svg';

import {theme} from './theme';

export const Layout: FunctionComponent = ({children}: any) => (
  <ThemeProvider theme={theme}>
    <Modal isOpen={true}>
      <Card width={'320px'} height={'450px'}>
        <Flex px={[3, 3, 4]} borderBottom={1} borderColor={'#E8E8E8'} mt={'0.8'}>
          <RimbleImage alt="State Channels" pb={2} height="auto" src={logo} />
        </Flex>
        {children}
      </Card>
    </Modal>
  </ThemeProvider>
);
