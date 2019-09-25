import { adjudicatorWatcher } from '../redux/sagas/adjudicator-watcher';
import { ethers } from 'ethers';
import SagaTester from 'redux-saga-tester';
import * as actions from '../redux/actions';
import {
  depositContract,
  createChallenge,
  concludeGame,
  refuteChallenge,
  respondWithMove,
  getChannelId,
  defaultDepositAmount,
} from './test-utils';
import * as walletStates from '../redux/state';
import { getGanacheProvider } from 'magmo-devtools';
jest.setTimeout(60000);

const createWatcherState = (
  processId: string,
  ...channelIds: string[]
): walletStates.Initialized => {
  const channelSubscriptions: walletStates.ChannelSubscriptions = {};
  for (const channelId of channelIds) {
    channelSubscriptions[channelId] = channelSubscriptions[channelId] || [];
    channelSubscriptions[channelId].push({ processId, protocolLocator: [] });
  }

  return walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,
    uid: '',
    processStore: {},
    channelSubscriptions,
    address: '',
    privateKey: '',
  });
};
// TODO: Get these tests working
describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  let nonce = 5;

  function getNextNonce() {
    return ++nonce;
  }
  beforeAll(async () => {
    // This is a work around for https://github.com/ethers-io/ethers.js/issues/393
    // We manually create a transaction to force a block to be mined in ganache so that events get properly caught
    // otherwise the first event is always missed since ethers won't listen for events until a block has been mined
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    await depositContract(provider, channelId);
  });

  it.skip('should not handle an event when no process has registered', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const initialState = walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: '',
      processStore: {},
      channelSubscriptions: {},
      privateKey: '',
      address: '',
    });
    const sagaTester = new SagaTester({ initialState });

    sagaTester.start(adjudicatorWatcher, provider);
    await depositContract(provider, channelId);

    expect(sagaTester.numCalled('WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT')).toEqual(0);
  });

  it.skip('should ignore events for other channels', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const channelIdToIgnore = await getChannelId(
      provider,
      getNextNonce(),
      participantA,
      participantB,
    );
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });

    sagaTester.start(adjudicatorWatcher, provider);

    await depositContract(provider, channelIdToIgnore);
    expect(sagaTester.numCalled('WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT')).toEqual(0);
  });

  it.skip('should handle a funds received event when registered for that channel', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({
      initialState: createWatcherState(processId, channelId),
    });
    sagaTester.start(adjudicatorWatcher, provider);

    await depositContract(provider, channelId);
    await sagaTester.waitFor('WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT');

    const action: actions.FundingReceivedEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(
      actions.fundingReceivedEvent({
        processId,
        protocolLocator: [],
        channelId,
        amount: defaultDepositAmount,
        totalForDestination: defaultDepositAmount,
      }),
    );
  });

  it.skip('should handle a challengeCreated event when registered for that channel', async () => {
    const startTimestamp = Date.now();
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);
    await createChallenge(provider, channelNonce, participantA, participantB);
    await sagaTester.waitFor('WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET');

    const action: actions.ChallengeExpirySetEvent = sagaTester.getLatestCalledAction();
    expect(action.expiryTime).toBeGreaterThan(startTimestamp);
  });

  it.skip('should handle a challengeCreated event', async () => {
    const startTimestamp = Date.now();
    const channelNonce = getNextNonce();

    const processId = ethers.Wallet.createRandom().address;

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId) });
    sagaTester.start(adjudicatorWatcher, provider);

    const challengeState = await createChallenge(
      provider,
      channelNonce,
      participantA,
      participantB,
    );

    await sagaTester.waitFor('WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT');

    const action: actions.ChallengeCreatedEvent = sagaTester.getLatestCalledAction();

    expect(action.finalizedAt).toBeGreaterThan(startTimestamp);
    expect(action.commitment).toEqual(challengeState);
  });

  it.skip('should handle a concluded event when registered for that channel', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);

    await concludeGame(provider, channelNonce, participantA, participantB);

    await sagaTester.waitFor('WALLET.ADJUDICATOR.CONCLUDED_EVENT');
    const action: actions.ConcludedEvent = sagaTester.getLatestCalledAction();

    expect(action).toEqual(actions.concludedEvent({ channelId }));
  });

  it.skip('should handle a refute event when registered for that channel', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;
    await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);

    const refuteCommitment = await refuteChallenge(
      provider,
      channelNonce,
      participantA,
      participantB,
    );

    await sagaTester.waitFor('WALLET.ADJUDICATOR.REFUTED_EVENT');

    const action: actions.RefutedEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(
      actions.refutedEvent({ processId, protocolLocator: [], channelId, refuteCommitment }),
    );
  });

  it.skip('should handle a respondWithMove event when registered for that channel', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;

    await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);

    const response = await respondWithMove(provider, channelNonce, participantA, participantB);

    await sagaTester.waitFor('WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT');

    const action: actions.RespondWithMoveEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(
      actions.respondWithMoveEvent({
        processId,
        protocolLocator: [],
        channelId,
        responseCommitment: response.toCommitment,
        responseSignature: response.toSig,
      }),
    );
  });
});
