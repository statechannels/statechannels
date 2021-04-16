import React from 'react';
import '../wallet.scss';
import {DirectFunder} from '@statechannels/wallet-core';

import {ConfirmCreateChannel} from './confirm-create-channel-workflow';

interface Props {
  // TODO: generalize to all objectives
  objective: DirectFunder.OpenChannelObjective;
}

export const Objective = (props: Props) => {
  const {objective} = props;

  if (!objective.approved) {
    return (
      <div
        style={{
          paddingTop: '50px',
          textAlign: 'center'
        }}
        className="application-workflow-prompt"
      >
        <ConfirmCreateChannel />
      </div>
    );
  }
  return (
    <div
      style={{
        paddingTop: '50px',
        textAlign: 'center'
      }}
      className="application-workflow-prompt"
    ></div>
  );
};
