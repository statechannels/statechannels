import {Machine, StateNodeConfig, spawn, assign} from 'xstate';
import {flatMap} from 'rxjs/operators';

import {Store} from '../store';
import {ChannelChainInfo} from '../chain';

const WORKFLOW = 'challenge-channel';

export type Init = {channelId: string};

export const config: StateNodeConfig<Init, any, any> = {
  key: WORKFLOW,
  initial: 'idle',
  entry: 'assignChainWatcher',
  on: {CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED: 'done'},
  states: {
    idle: {on: {SAFE_TO_CHALLENGE: 'submit'}},
    submit: {invoke: {src: 'submitChallengeTransaction', onDone: 'idle', onError: 'failure'}},
    done: {type: 'final'},
    failure: {entry: assign<any>({error: () => 'Challenge failed'})}
  }
};

/**
 * Helper method for determining what the chain's latest state represents with
 * regards to a particular channelId and our local representation of that channel
 * in our store.
 */
async function determineChallengeStatus(
  store: Store,
  channelId: string,
  chainInfo: ChannelChainInfo
): Promise<
  | 'CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED'
  | 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS'
  | 'SAFE_TO_CHALLENGE'
> {
  const {challenge} = chainInfo;

  if (typeof challenge !== 'undefined') {
    const {
      state: {turnNum: challengeTurnNum}
    } = challenge;

    const {
      latestState: {turnNum}
    } = await store.getEntry(channelId);

    if (!challengeTurnNum.eq(turnNum)) {
      return 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS';
    }

    return 'CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED';
  }

  return 'SAFE_TO_CHALLENGE';
}

export const machine = (store: Store) => {
  const subscribeChallengeRegisteredEvent = ({channelId}: Init) =>
    store.chain
      .chainUpdatedFeed(channelId)
      .pipe(flatMap(determineChallengeStatus.bind(null, store, channelId)));

  const submitChallengeTransaction = async ({channelId}: Init) => {
    const {
      support,
      myIndex,
      channelConstants: {participants}
    } = await store.getEntry(channelId);
    const privateKey = await store.getPrivateKey(participants[myIndex].signingAddress);
    await store.chain.challenge(support, privateKey);
  };

  return Machine(config).withConfig({
    actions: {
      assignChainWatcher: assign<Init & {chainWatcher: any}>({
        chainWatcher: (ctx: Init) => spawn(subscribeChallengeRegisteredEvent(ctx))
      })
    } as any, // TODO: Figure out why we get a type error here... same in depositing.ts
    services: {submitChallengeTransaction}
  });
};
