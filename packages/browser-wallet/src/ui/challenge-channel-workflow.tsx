import React from 'react';
import {Interpreter} from 'xstate';

import './wallet.scss';

interface Props {
  service: Interpreter<any>;
}

export const ChallengeChannel = (props: Props) => (
  <p>Application has requested a challenge. Check your wallet.</p>
);
