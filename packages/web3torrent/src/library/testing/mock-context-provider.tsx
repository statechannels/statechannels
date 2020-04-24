import React from 'react';
import {
  ClientInitializationContext,
  InitializationStatus
} from '../../context/client-initialization-context';
import {
  TorrentClientContext,
  TorrentClientContextInterface
} from '../../context/torrent-client-context';
import {ChannelContext, ChannelContextInterface} from '../../context/channel-context';
import {BudgetContext} from '../../context/budget-context';

export const mockWeb3TorrentClientContext = {
  initialize: jest.fn(),
  initializationStatus: 'Initialized' as InitializationStatus
};

export const mockTorrentClientContext: TorrentClientContextInterface = {
  download: jest.fn(),
  upload: jest.fn(),
  cancel: jest.fn(),
  getTorrentUI: jest.fn()
};

export const mockChannelContext: ChannelContextInterface = {
  channelState: {},
  mySigningAddress: '0x0',
  challengeChannel: jest.fn()
};

export const mockBudgetContext = {
  loading: false,
  budget: undefined,
  createBudget: jest.fn(),
  closeBudget: jest.fn()
};
export const MockContextProvider: React.FC = ({children}) => {
  // TODO: Probably a more elegant way of doing this
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
