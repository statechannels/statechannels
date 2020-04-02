import {spawn, assign, StateSchema, State, createMachine, StateMachine} from 'xstate';
import {flatMap} from 'rxjs/operators';

import {Store} from '../store';
import {ChannelChainInfo} from '../chain';

export interface Initial {
  channelId: string;
  challengeSubmitted?: boolean;
  chainWatcher?: any;
  error?: any;
}

type Typestate =
  | {value: 'idle'; context: Initial}
  | {value: 'waitForResponseOrTimeout'; context: Initial}
  | {value: 'submit'; context: Initial}
  | {value: 'done'; context: Initial}
  | {value: 'failure'; context: Initial};

type Context = Typestate['context'];

type ChainObservation =
  | 'CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED'
  | 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS'
  | 'SAFE_TO_CHALLENGE'
  | 'TIMEOUT_PASSED'
  | 'RESPONSE_OBSERVED';

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
  {channelId, challengeSubmitted}: Initial | Initial,
  store: Store,
  chainInfo: ChannelChainInfo
): Promise<ChainObservation> {
  // TODO: This function is starting to look ugly. Split it up?
  const {challenge} = chainInfo;
  if (!challengeSubmitted) {
    // TODO: I think it is possible that the chain is UPDATED
    // _after_ challenge tx is sent to network but before the
    // Initial event is observed, which would cause
    // this machine to send tx twice. If e.g., a new deposit
    // occured for some reason.
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
  } else {
    if (typeof challenge !== 'undefined') {
      const {challengeExpiry} = challenge;
      if (challengeExpiry.gt(1337)) {
        return 'TIMEOUT_PASSED';
      } else {
        // TODO: Why would UPDATED get triggered if this was the case? Is it possible?
        // A deposit mid-challenge?
        return 'CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED';
      }
    } else {
      return 'RESPONSE_OBSERVED';
    }
  }
}

const subscribeChainUpdatedFeed = (store: Store) => (ctx: Initial | Initial) =>
  store.chain
    .chainUpdatedFeed(ctx.channelId)
    .pipe(flatMap(determineChallengeStatus.bind(null, ctx, store)));

const submitChallengeTransaction = (store: Store) => async ({channelId}: Initial) => {
  const {
    support,
    myIndex,
    channelConstants: {participants}
  } = await store.getEntry(channelId);
  const privateKey = await store.getPrivateKey(participants[myIndex].signingAddress);
  await store.chain.challenge(support, privateKey);
};

const assignChainWatcher = (store: Store) =>
  assign<Initial>({
    chainWatcher: (ctx: Initial) => spawn(subscribeChainUpdatedFeed(store)(ctx))
  });

export const machine = (
  store: Store,
  context: Initial
): StateMachine<Context, Schema, Event, Typestate> =>
  createMachine<Context, Event, Typestate>({
    context,
    id: 'challenge-channel',
    initial: 'idle',
    entry: assignChainWatcher(store),

    on: {
      CHALLENGE_DEALT_WITH: {
        target: 'done'
      }
    },

    states: {
      idle: {
        on: {
          SAFE_TO_CHALLENGE: {
            target: 'submit'
          },
          CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED: {
            target: 'waitForResponseOrTimeout'
          }
        }
      },

      waitForResponseOrTimeout: {
        on: {
          TIMEOUT_PASSED: {
            target: 'done'
          },
          RESPONSE_OBSERVED: {
            target: 'done'
          }
        }
      },

      submit: {
        invoke: {
          src: submitChallengeTransaction(store),
          onDone: {
            target: 'idle',
            actions: assign<Context>({challengeSubmitted: true})
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
