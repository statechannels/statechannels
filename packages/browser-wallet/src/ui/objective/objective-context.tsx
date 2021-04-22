import {DirectFunder} from '@statechannels/wallet-core';
import React from 'react';

export const ObjectiveContext = React.createContext<
  (triggerObjectiveEvent: DirectFunder.OpenChannelEvent) => void
>(() => {});
