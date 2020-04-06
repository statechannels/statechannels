import {ChannelStoreEntry} from '../channel-store-entry';
import {ChannelStoredData} from '../types';
import {appState, wallet1, wallet2} from '../../workflows/tests/data';
import {hashState, createSignatureEntry} from '../state-utils';

describe('isSupported', () => {
  it('returns false when there is an invalid transition due to turnnum', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(3), stateHash: hashState(appState(3))};
    const signatures = {
      [firstSupportState.stateHash]: [createSignatureEntry(firstSupportState, wallet1.privateKey)],
      [secondSupportState.stateHash]: [createSignatureEntry(firstSupportState, wallet2.privateKey)]
    };
    const channelStoreData: ChannelStoredData = {
      stateVariables: [firstSupportState, secondSupportState],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      signatures,
      applicationSite: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(false);
  });

  it('returns true when there a valid chain of signed states', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(1), stateHash: hashState(appState(1))};
    const signatures = {
      [firstSupportState.stateHash]: [createSignatureEntry(firstSupportState, wallet1.privateKey)],
      [secondSupportState.stateHash]: [createSignatureEntry(secondSupportState, wallet2.privateKey)]
    };
    const channelStoreData: ChannelStoredData = {
      stateVariables: [firstSupportState, secondSupportState],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      signatures,
      applicationSite: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns true when there a state signed by everyone', () => {
    const supportState = {...appState(0), stateHash: hashState(appState(0))};

    const signatures = {
      [supportState.stateHash]: [
        createSignatureEntry(supportState, wallet1.privateKey),
        createSignatureEntry(supportState, wallet2.privateKey)
      ]
    };
    const channelStoreData: ChannelStoredData = {
      stateVariables: [supportState],
      channelConstants: supportState,
      myIndex: 0,
      funding: undefined,
      signatures,
      applicationSite: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns the correct support when there are unsupported states', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(1), stateHash: hashState(appState(1))};
    const thirdUnsupportedState = {...appState(3), stateHash: hashState(appState(3))};
    const signatures = {
      [firstSupportState.stateHash]: [createSignatureEntry(firstSupportState, wallet1.privateKey)],
      [secondSupportState.stateHash]: [
        createSignatureEntry(secondSupportState, wallet2.privateKey)
      ],
      [thirdUnsupportedState.stateHash]: [
        createSignatureEntry(thirdUnsupportedState, wallet1.privateKey)
      ]
    };
    const channelStoreData: ChannelStoredData = {
      stateVariables: [firstSupportState, secondSupportState, thirdUnsupportedState],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      signatures,
      applicationSite: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
    expect(entry.supported).toMatchObject(secondSupportState);
  });
});
