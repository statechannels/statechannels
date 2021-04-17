import React, {useContext} from 'react';
import '../wallet.scss';
import {Button, Flex, Text as RimbleText} from 'rimble-ui';

import {ObjectiveContext} from './objective-context';

export const ConfirmCreateChannel = () => {
  const onObjectiveEvent = useContext(ObjectiveContext);

  return (
    <Flex alignItems="left" flexDirection="column">
      <RimbleText fontSize={2} pb={2}>
        Do you wish to create a channel?
      </RimbleText>
      <Button id="yes" onClick={() => onObjectiveEvent({type: 'Approval'})}>
        Yes
      </Button>
      {/** TODO: add objective rejection */}
      <Button.Text onClick={() => onObjectiveEvent({type: 'Approval'})}>No</Button.Text>
    </Flex>
  );
};
