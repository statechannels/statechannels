import * as walletStates from '../state';
import * as selectors from '../selectors';
import { ChannelState } from '../channel-store';
import { Commitment } from '../../domain';

describe('getAdjudicatorWatcherProcessesForChannel', () => {
  const createWatcherState = (
    processIds: string[],
    channelId?: string,
  ): walletStates.Initialized => {
    const channelSubscriptions: walletStates.ChannelSubscriptions = {};
    processIds.forEach(processId => {
      if (channelId) {
        channelSubscriptions[processId] = [channelId];
      } else {
        channelSubscriptions[processId] = [];
      }
    });
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
    expect(selectors.getAdjudicatorWatcherProcessesForChannel(state, '0x0')).toEqual([]);
  });

  it('should return an array of processIds that are registered for a channel', () => {
    const processIds = ['p1', 'p2'];
    const channelId = '0x0';
    const state = createWatcherState(processIds, channelId);
    expect(selectors.getAdjudicatorWatcherProcessesForChannel(state, '0x0')).toEqual(processIds);
  });

  it('should return an empty array when no processes are registered for the channel', () => {
    const processIds = ['p1', 'p2'];
    const channelId = '0x0';
    const state = createWatcherState(processIds, channelId);
    expect(selectors.getAdjudicatorWatcherProcessesForChannel(state, '0x1')).toEqual([]);
  });

  it('should return an empty array when the process store is empty', () => {
    const state = createWatcherState([]);
    expect(selectors.getAdjudicatorWatcherProcessesForChannel(state, '0x1')).toEqual([]);
  });

  it('should return an empty array when no channels are monitored', () => {
    const state = createWatcherState(['p1', 'p2']);
    expect(selectors.getAdjudicatorWatcherProcessesForChannel(state, '0x1')).toEqual([]);
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
      { commitment: {} as Commitment, signature: 'signature' },
      { commitment: {} as Commitment, signature: 'signature' },
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
