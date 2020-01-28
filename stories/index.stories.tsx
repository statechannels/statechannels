import React from 'react';
import {Button} from '@storybook/react/demo';
import Wallet from '../src/ui/wallet';
import {applicationWorkflow} from '../src/workflows/application';
export default {title: 'X-state wallet'};

export const withText = () => <Button>Hello Button</Button>;

export const withEmoji = () => (
  <Button>
    <span role="img" aria-label="so cool">
      😀 😎 👍 💯
    </span>
  </Button>
);

withEmoji.story = {
  name: 'with emoji'
};

import {interpret} from 'xstate';
import {Store} from '@statechannels/wallet-protocols';

const store = new Store({});

const machine = interpret<any, any, any>(applicationWorkflow(store), {
  devTools: true
});

export const wallet = () => <Wallet workflow={machine} />;

wallet.story = {
  name: 'wallet'
};
