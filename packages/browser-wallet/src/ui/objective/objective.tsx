import React from 'react';
import '../wallet.scss';
import {DirectFunder} from '@statechannels/wallet-core';
import {Text as RimbleText} from 'rimble-ui';

import {ConfirmCreateChannel} from './confirm-create-channel-workflow';

interface Props {
  // TODO: generalize to all objectives
  objective: DirectFunder.OpenChannelObjective;
}

export const Objective = (props: Props) => {
  const {objective} = props;

  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
      className="application-workflow-prompt"
    >
      {objective.status === 'DirectFunder.approval' && (
        <ConfirmCreateChannel channelId={objective.channelId} />
      )}
      {/** TODO: map status to UI for the user */}
      {objective.status !== 'DirectFunder.approval' && (
        <RimbleText fontSize={2} pb={2}>
          {objective.status}
        </RimbleText>
      )}
    </div>
  );
};
