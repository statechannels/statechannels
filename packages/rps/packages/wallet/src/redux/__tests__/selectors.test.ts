import * as walletStates from '../state';
import * as selectors from '../selectors';
import { WalletProtocol } from '../types';

describe('getAdjudicatorWatcherProcessesForChannel', () => {
  const createWatcherState = (
    processIds: string[],
    channelId?: string,
  ): walletStates.Initialized => {
    const processStore: walletStates.ProcessStore = {};
    const channelsToMonitor = channelId ? [channelId] : [];
    for (const processId of processIds) {
      processStore[processId] = {
        protocolState: {},
        processId,
        channelsToMonitor,
        protocol: WalletProtocol.TransactionSubmission,
      };
    }
    return walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: '',
      consensusLibrary: '',
      networkId: 0,
      adjudicator: '',
      processStore,
    });
  };

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
