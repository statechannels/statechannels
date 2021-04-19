import {RichObjectiveEvent} from '@statechannels/wallet-core';
import React from 'react';

export const ObjectiveContext = React.createContext<(onObjectiveEvent: RichObjectiveEvent) => void>(
  () => {}
);
