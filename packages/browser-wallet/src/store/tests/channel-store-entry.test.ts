import {hashState, createSignatureEntry, ChannelStoredData} from '@statechannels/wallet-core';

import {ChannelStoreEntry} from '../channel-store-entry';
import {appState, wallet1, wallet2} from '../../tests/data';
import {Errors} from '..';

const signState = (state, privateKeys: string[]) => ({
  ...state,
  signatures: privateKeys.map(k => createSignatureEntry(state, k))
});

describe('isSupported', () => {
  it('returns false when there is an invalid transition due to turnnum', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(3), stateHash: hashState(appState(3))};
    const stateVariables = [
      signState(secondSupportState, [wallet2.privateKey]),
      signState(firstSupportState, [wallet1.privateKey])
    ];
    const channelStoreData: ChannelStoredData = {
      stateVariables,
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(false);
  });

  it('returns true when there a valid chain of signed states', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(1), stateHash: hashState(appState(1))};
    const channelStoreData: ChannelStoredData = {
      stateVariables: [
        signState(secondSupportState, [wallet2.privateKey]),
        signState(firstSupportState, [wallet1.privateKey])
      ],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns true when there a valid chain of signed states, turnNum = 2,3', () => {
    const firstSupportState = {...appState(2), stateHash: hashState(appState(2))};
    const secondSupportState = {...appState(3), stateHash: hashState(appState(3))};
    const channelStoreData: ChannelStoredData = {
      stateVariables: [
        signState(secondSupportState, [wallet2.privateKey]),
        signState(firstSupportState, [wallet1.privateKey])
      ],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns true when there a valid chain of signed states, turnNum = 3,4', () => {
    const firstSupportState = {...appState(3), stateHash: hashState(appState(3))};
    const secondSupportState = {...appState(4), stateHash: hashState(appState(4))};
    const channelStoreData: ChannelStoredData = {
      stateVariables: [
        signState(secondSupportState, [wallet1.privateKey]),
        signState(firstSupportState, [wallet2.privateKey])
      ],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns true when there a state signed by everyone', () => {
    const supportState = {...appState(0), stateHash: hashState(appState(0))};

    const signed = signState(supportState, [wallet1.privateKey, wallet2.privateKey]);
    const channelStoreData: ChannelStoredData = {
      stateVariables: [signed],
      channelConstants: supportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
  });

  it('returns the correct support when there are unsupported states', () => {
    const firstSupportState = {...appState(0), stateHash: hashState(appState(0))};
    const secondSupportState = {...appState(1), stateHash: hashState(appState(1))};
    const thirdUnsupportedState = {...appState(3), stateHash: hashState(appState(3))};
    const stateVariables = [
      signState(thirdUnsupportedState, [wallet1.privateKey]),
      signState(secondSupportState, [wallet2.privateKey]),
      signState(firstSupportState, [wallet1.privateKey])
    ];

    const channelStoreData: ChannelStoredData = {
      stateVariables,
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
    expect(entry.supported).toMatchObject(secondSupportState);
  });
});

it('throws an error when trying to add a state with the same turn number', () => {
  const initialState = {...appState(5, true), stateHash: hashState(appState(5, true))};
  const duplicateTurnNumState = {...appState(5, false), stateHash: hashState(appState(5, false))};

  const channelStoreData: ChannelStoredData = {
    stateVariables: [signState(initialState, [wallet1.privateKey])],
    channelConstants: initialState,
    myIndex: 0,
    funding: undefined,
    applicationDomain: 'localhost'
  };
  const entry = new ChannelStoreEntry(channelStoreData);
  const duplicateTurnNumSignatureEntry = signState(duplicateTurnNumState, [wallet2.privateKey])
    .signatures[0];
  expect(() => entry.addState(duplicateTurnNumState, duplicateTurnNumSignatureEntry)).toThrow(
    Errors.duplicateTurnNums
  );
});

describe('hasConclusionProof (nParticipants = 2) ', () => {
  it('returns true when there is a single, double-signed isFinal=true state', () => {
    const singleState = {...appState(4, true), stateHash: hashState(appState(4, true))};
    const stateVariables = [signState(singleState, [wallet1.privateKey, wallet2.privateKey])];
    const channelStoreData: ChannelStoredData = {
      stateVariables,
      channelConstants: singleState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
    expect(entry.hasConclusionProof).toBe(true);
  });

  it('returns true when there is a valid chain of isFinal = true signed states, turnNum = 3,4', () => {
    const firstSupportState = {...appState(3, true), stateHash: hashState(appState(3, true))};
    const secondSupportState = {...appState(4, true), stateHash: hashState(appState(4, true))};
    const channelStoreData: ChannelStoredData = {
      stateVariables: [
        signState(secondSupportState, [wallet1.privateKey]),
        signState(firstSupportState, [wallet2.privateKey])
      ],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
    expect(entry.hasConclusionProof).toBe(true);
  });

  it('returns true when there is a double-signed isFinal=true state AND a non-final chain', () => {
    const firstSupportState = {...appState(3, false), stateHash: hashState(appState(3, false))};
    const secondSupportState = {...appState(4, true), stateHash: hashState(appState(4, true))};
    const channelStoreData: ChannelStoredData = {
      stateVariables: [
        signState(secondSupportState, [wallet1.privateKey, wallet2.privateKey]),
        signState(firstSupportState, [wallet2.privateKey])
      ],
      channelConstants: firstSupportState,
      myIndex: 0,
      funding: undefined,
      applicationDomain: 'localhost'
    };
    const entry = new ChannelStoreEntry(channelStoreData);
    expect(entry.isSupported).toBe(true);
    expect(entry.hasConclusionProof).toBe(true);
  });
});
