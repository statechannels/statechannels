import {spawn, assign, StateSchema, State, createMachine, StateMachine, Actor} from 'xstate';
import {flatMap} from 'rxjs/operators';

import {Store} from '../store';
import {ChannelChainInfo} from '../chain';
import {Zero} from 'ethers/constants';

export interface Initial {
  channelId: string;
  error?: any;
}

interface ChannelStorageWatcherEnabled extends Initial {
  channelStorageWatcher: Actor;
}

type Typestate =
  | {value: 'idle'; context: Initial | ChannelStorageWatcherEnabled}
  | {value: 'waitForResponseOrTimeout'; context: ChannelStorageWatcherEnabled}
  | {value: 'submit'; context: ChannelStorageWatcherEnabled}
  | {value: 'done'; context: ChannelStorageWatcherEnabled}
  | {value: 'failure'; context: ChannelStorageWatcherEnabled};

type Context = Typestate['context'];

type ChainObservation =
  | 'CHALLENGE_IS_ONCHAIN_WITH_CORRECT_TURN_NUM_RECORD'
  | 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS'
  | 'NO_CHALLENGE_EXISTS_ONCHAIN'
  | 'TIMEOUT_PASSED_FOR_ONCHAIN_CHALLENGE';

interface Schema extends StateSchema<Context> {
  states: {
    idle: {};
    waitForResponseOrTimeout: {};
    submit: {};
    done: {};
    failure: {};
  };
}

export type WorkflowState = State<Context, Event, Schema, Typestate>;

export type StateValue = keyof Schema['states'];

/**
 * Helper method for determining what the chain's latest state represents with
 * regards to a particular channelId and our local representation of that channel
 * in our store.
 */
async function determineChallengeStatus(
  {channelId}: Initial,
  store: Store,
  chainInfo: ChannelChainInfo
): Promise<ChainObservation> {
  const {
    channelStorage: {turnNumRecord, finalizesAt}
  } = chainInfo;
  const currentBlock = await store.chain.getBlockNumber();
  const {
    latestState: {turnNum}
  } = await store.getEntry(channelId);

  // TODO: I think it is possible that the chain is UPDATED
  // _after_ challenge tx is sent to network but before the
  // Initial event is observed, which would cause
  // this machine to send tx twice. If e.g., a new deposit
  // occured for some reason.
  if (finalizesAt.lte(Zero)) {
    return 'NO_CHALLENGE_EXISTS_ONCHAIN';
  } else if (finalizesAt.gt(currentBlock)) {
    if (!turnNumRecord.eq(turnNum)) {
      return 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS';
    } else {
      // NOTE: For extra safety we could check the fingerprint
      return 'CHALLENGE_IS_ONCHAIN_WITH_CORRECT_TURN_NUM_RECORD';
    }
  } else {
    return 'TIMEOUT_PASSED_FOR_ONCHAIN_CHALLENGE';
  }
}

const subscribeChainUpdatedFeed = (store: Store) => (ctx: Initial) =>
  store.chain
    .chainUpdatedFeed(ctx.channelId)
    .pipe(flatMap(determineChallengeStatus.bind(null, ctx, store)));

const submitChallengeTransaction = (store: Store) => async ({channelId}: Initial) => {
  const {support, myAddress} = await store.getEntry(channelId);
  const privateKey = await store.getPrivateKey(myAddress);
  await store.chain.challenge(support, privateKey);
};

const assignChannelStorageWatcher = (store: Store) =>
  assign<Context>({
    channelStorageWatcher: ctx => spawn(subscribeChainUpdatedFeed(store)(ctx))
  });

export const machine = (
  store: Store,
  context: Initial
): StateMachine<Context, Schema, Event, Typestate> =>
  createMachine<Context, Event, Typestate>({
    context,
    id: 'challenge-channel',
    initial: 'idle',
    entry: assignChannelStorageWatcher(store),

    on: {
      CHALLENGE_DEALT_WITH: {
        target: 'done'
      }
    },

    states: {
      idle: {
        on: {
          NO_CHALLENGE_EXISTS_ONCHAIN: {
            target: 'submit'
          },
          CHALLENGE_IS_ONCHAIN_WITH_CORRECT_TURN_NUM_RECORD: {
            target: 'waitForResponseOrTimeout'
          }
        }
      },

      waitForResponseOrTimeout: {
        on: {
          TIMEOUT_PASSED_FOR_ONCHAIN_CHALLENGE: {
            target: 'done'
          }
          // TODO: Handle responses...
          // RESPONSE_OBSERVED: {
          //   target: 'done'
          // }
        }
      },

      submit: {
        invoke: {
          src: submitChallengeTransaction(store),
          onDone: {
            target: 'idle'
          },
          onError: {
            target: 'failure'
          }
        }
      },

      done: {
        id: 'done',
        type: 'final'
      },

      failure: {
        id: 'failure',
        type: 'final',
        entry: assign<Context>({error: 'Challenge failed'})
      }
    }
  });
