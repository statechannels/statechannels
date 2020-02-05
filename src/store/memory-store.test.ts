import {MemoryStore, Protocol, State} from './memory-store';

describe('stateReceived', () => {
  test('it fires when a state with the correct channel id is received', () => {
    const channelId = 'abc123';
    const state = {channelId};
    const signature = {r: 'r', s: 's'};
    const signedState = {state, signatures: [signature]};
    const store = new MemoryStore();

    const outputs: State[] = [];
    store.stateReceivedFeed(channelId).subscribe(x => outputs.push(x));
    store.pushMessage({signedStates: [signedState]});

    expect(outputs).toEqual([state]);
  });

  test("it doesn't fire if the channelId doesn't match", () => {
    const channelId = 'abc123';
    const state = {channelId};
    const signature = {r: 'r', s: 's'};
    const signedState = {state, signatures: [signature]};
    const store = new MemoryStore();

    const outputs: State[] = [];
    store.stateReceivedFeed('a-different-channel-id').subscribe(x => outputs.push(x));
    store.pushMessage({signedStates: [signedState]});

    expect(outputs).toEqual([]);
  });
});

test('new-protocols', () => {
  const protocol: Protocol = {name: 'CreateAndDirectFund', participants: []};

  const store = new MemoryStore();

  const outputs: Protocol[] = [];
  store.newProtocolFeed().subscribe(x => outputs.push(x));

  store.pushMessage({protocols: [protocol]});
  expect(outputs).toEqual([protocol]);

  // doing it twice doesn't change anything
  store.pushMessage({protocols: [protocol]});
  expect(outputs).toEqual([protocol]);
});
