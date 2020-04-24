import React from 'react';
import {
  ClientInitializationContext,
  InitializationStatus
} from '../src/context/client-initialization-context';
import {
  TorrentClientContext,
  TorrentClientContextInterface
} from '../src/context/torrent-client-context';
import {ChannelContext, ChannelContextInterface} from '../src/context/channel-context';
import {BudgetContext} from '../src/context/budget-context';

export const mockWeb3TorrentClientContext = {
  initialize: (() => {}) as any,
  initializationStatus: 'Initialized' as InitializationStatus
};

export const mockTorrentClientContext: TorrentClientContextInterface = {
  download: (() => {}) as any,
  upload: (() => {}) as any,
  cancel: (() => {}) as any,
  getTorrentUI: (() => {}) as any
};

export const mockChannelContext: ChannelContextInterface = {
  channelState: {},
  mySigningAddress: '0x0',
  challengeChannel: (() => {}) as any
};

export const mockBudgetContext = {
  loading: false,
  budget: undefined,
  createBudget: (() => {}) as any,
  closeBudget: (() => {}) as any
};

// TODO: This is essentially the same as the one used for jest tests but has not jest references

export const StorybookMockContextProvider: React.FC = ({children}) => {
  return (
    <ClientInitializationContext.Provider value={mockWeb3TorrentClientContext}>
      <TorrentClientContext.Provider value={mockTorrentClientContext}>
        <ChannelContext.Provider value={mockChannelContext}>
          <BudgetContext.Provider value={mockBudgetContext}>{children}</BudgetContext.Provider>
        </ChannelContext.Provider>
      </TorrentClientContext.Provider>
    </ClientInitializationContext.Provider>
  );
};
