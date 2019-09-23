import * as walletStates from '../state';
import * as selectors from '../selectors';
import { ChannelState } from '../channel-store';
import { Commitment } from '../../domain';
import { SignedState } from 'nitro-protocol';

describe('getAdjudicatorWatcherProcessesForChannel', () => {
  const createWatcherState = (
    channelId: string,
    subscribers: walletStates.ChannelSubscriber[],
  ): walletStates.Initialized => {
    const channelSubscriptions: walletStates.ChannelSubscriptions = {};

    channelSubscriptions[channelId] = subscribers;

    return walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: '',
      processStore: {},
      channelSubscriptions,
      address: 'address',
      privateKey: 'privateKey',
    });
  };

  it('should return an empty array when channelSubscriptions is empty', () => {
    const state = walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: '',
      processStore: {},
      channelSubscriptions: {},
      address: 'address',
      privateKey: 'privateKey',
    });
    expect(selectors.getAdjudicatorWatcherSubscribersForChannel(state, '0x0')).toEqual([]);
  });

  it('should return an array of channel subscribes that are registered for a channel', () => {
    const subscribers = [
      { processId: 'p1', protocolLocator: [] },
      { processId: 'p2', protocolLocator: [] },
    ];
    const channelId = '0x0';
    const state = createWatcherState(channelId, subscribers);
    expect(selectors.getAdjudicatorWatcherSubscribersForChannel(state, '0x0')).toEqual(subscribers);
  });

  it('should return an empty array when no processes are registered for the channel', () => {
    const subscribers = [
      { processId: 'p1', protocolLocator: [] },
      { processId: 'p2', protocolLocator: [] },
    ];
    const channelId = '0x0';
    const state = createWatcherState(channelId, subscribers);
    expect(selectors.getAdjudicatorWatcherSubscribersForChannel(state, '0x1')).toEqual([]);
  });

  it('should return an empty array when the process store is empty', () => {
    const channelId = '0x1';
    const state = createWatcherState(channelId, []);
    expect(selectors.getAdjudicatorWatcherSubscribersForChannel(state, '0x1')).toEqual([]);
  });
});

describe('getNextNonce', () => {
  const defaultChannelState: ChannelState = {
    channelId: '0x0',
    libraryAddress: '0x0',
    ourIndex: 0,
    participants: ['0x0', '0x0'],
    channelNonce: 0,
    funded: false,
    address: 'address',
    privateKey: 'privateKey',
    commitments: [
      { commitment: {} as Commitment, signature: 'signature', signedState: {} as SignedState },
      { commitment: {} as Commitment, signature: 'signature', signedState: {} as SignedState },
    ],
    turnNum: 0,
  };
  const state = {
    ...walletStates.EMPTY_SHARED_DATA,
    channelStore: {
      ['0x1']: {
        ...defaultChannelState,
        libraryAddress: '0x1',
        channelNonce: 0,
      },
      ['0x2']: {
        ...defaultChannelState,
        libraryAddress: '0x1',
        channelNonce: 1,
      },
      ['0x3']: {
        ...defaultChannelState,
        libraryAddress: '0x2',
        channelNonce: 2,
      },
    },
  };

  it('gets the next nonce when multiple matching channels exist', () => {
    expect(selectors.getNextNonce(state, '0x1')).toEqual(2);
  });

  it('returns 0 when no matching channels exist', () => {
    expect(selectors.getNextNonce(state, '0x3')).toEqual(0);
  });

  it('returns the next nonce when one matching channel exists', () => {
    expect(selectors.getNextNonce(state, '0x2')).toEqual(3);
  });
});
