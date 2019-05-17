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
jest.setTimeout(60000);

const createWatcherState = (
  processId: string,
  ...channelIds: string[]
): walletStates.Initialized => {
  const channelSubscriptions: walletStates.ChannelSubscriptions = {};
  channelSubscriptions[processId] = channelIds;

  return walletStates.initialized({
    ...walletStates.EMPTY_SHARED_DATA,
    uid: '',
    processStore: {},
    adjudicatorStore: {},
    channelSubscriptions,
  });
};

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

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

  it('should not handle an event when no process has registered', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const initialState = walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: '',
      processStore: {},
      adjudicatorStore: {},
      channelSubscriptions: {},
    });
    const sagaTester = new SagaTester({ initialState });

    sagaTester.start(adjudicatorWatcher, provider);
    await depositContract(provider, channelId);

    expect(sagaTester.numCalled(actions.FUNDING_RECEIVED_EVENT)).toEqual(0);
  });

  it('should ignore events for other channels', async () => {
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
    expect(sagaTester.numCalled(actions.FUNDING_RECEIVED_EVENT)).toEqual(0);
  });

  it('should handle a funds received event when registered for that channel', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({
      initialState: createWatcherState(processId, channelId),
    });
    sagaTester.start(adjudicatorWatcher, provider);

    await depositContract(provider, channelId);
    await sagaTester.waitFor(actions.FUNDING_RECEIVED_EVENT);

    const action: actions.FundingReceivedEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(
      actions.fundingReceivedEvent(
        processId,
        channelId,
        defaultDepositAmount,
        defaultDepositAmount,
      ),
    );
  });

  it('should handle a challengeCreated event when registered for that channel', async () => {
    const startTimestamp = Date.now();
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);
    await createChallenge(provider, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.CHALLENGE_EXPIRY_SET_EVENT);

    const action: actions.ChallengeExpirySetEvent = sagaTester.getLatestCalledAction();
    expect(action.expiryTime).toBeGreaterThan(startTimestamp);
  });

  it('should handle a challengeCreated event', async () => {
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

    await sagaTester.waitFor(actions.CHALLENGE_CREATED_EVENT);

    const action: actions.ChallengeCreatedEvent = sagaTester.getLatestCalledAction();

    expect(action.finalizedAt).toBeGreaterThan(startTimestamp);
    expect(action.commitment).toEqual(challengeState);
  });

  it('should handle a concluded event when registered for that channel', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);

    await concludeGame(provider, channelNonce, participantA, participantB);

    await sagaTester.waitFor(actions.CONCLUDED_EVENT);
    const action: actions.ConcludedEvent = sagaTester.getLatestCalledAction();

    expect(action).toEqual(actions.concludedEvent(processId, channelId));
  });

  it('should handle a refute event when registered for that channel', async () => {
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

    await sagaTester.waitFor(actions.REFUTED_EVENT);

    const action: actions.RefutedEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(actions.refutedEvent(processId, channelId, refuteCommitment));
  });

  it('should handle a respondWithMove event when registered for that channel', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const processId = ethers.Wallet.createRandom().address;

    await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({ initialState: createWatcherState(processId, channelId) });
    sagaTester.start(adjudicatorWatcher, provider);

    const response = await respondWithMove(provider, channelNonce, participantA, participantB);

    await sagaTester.waitFor(actions.RESPOND_WITH_MOVE_EVENT);

    const action: actions.RespondWithMoveEvent = sagaTester.getLatestCalledAction();
    expect(action).toEqual(
      actions.respondWithMoveEvent(processId, channelId, response.toCommitment, response.toSig),
    );
  });
});
