import React from 'react';

import fakeApp from '../../images/fake-app.png';
import {Modal, Card, Flex, Image} from 'rimble-ui';

export function renderComponentInFrontOfApp(component) {
  function renderFunction() {
    return (
      <div>
        <Image src={fakeApp} />
        <Modal isOpen={true}>
          <Card width={'320px'} height={'450px'}>
            <Flex px={[3, 3, 4]} height={3} borderBottom={1} borderColor={'#E8E8E8'} mt={'0.8'}>
              <Image alt="State Channels" borderRadius={8} height="auto" src={logo} />
            </Flex>
            {component}
          </Card>
        </Modal>
      </div>
    );
  }
  return renderFunction;
}
