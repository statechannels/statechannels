import {
  assign,
  createMachine,
  DoneInvokeEvent,
  State,
  StateMachine,
  StateSchema,
  Guard,
  spawn,
  actions
} from 'xstate';
import {map} from 'rxjs/operators';

import {Store} from '@statechannels/wallet-core/lib/src/store';
import {ChannelChainInfo} from '@statechannels/wallet-core/lib/src/chain';

const {log} = actions;
export interface Initial {
  channelId: string;
}

interface Transaction {
  transactionId: string;
}

type Typestate =
  | {value: 'init'; context: Initial}
  | {value: 'waitForResponseOrTimeout'; context: Initial & Transaction}
  | {value: 'submitTransaction'; context: Initial}
  | {value: 'retry'; context: Initial & Transaction}
  | {value: 'waitMining'; context: Initial & Transaction}
  | {value: 'done'; context: Initial}
  | {value: 'failure'; context: Initial};

type Context = Typestate['context'];

interface Schema extends StateSchema<Context> {
  states: {
    init: {};
    submitTransaction: {};
    retry: {};
    waitMining: {};
    waitForResponseOrTimeout: {};
    done: {};
    failure: {};
  };
}

export type WorkflowState = State<Context, Event, Schema, Typestate>;

export type StateValue = keyof Schema['states'];

interface ChainEvent {
  type: 'CHAIN_EVENT';
  turnNumRecord: number;
  finalizesAt: number;
  finalized: boolean;
}

const noChallengeOnchain: Guard<Initial, ChainEvent> = {
  type: 'xstate.guard',
  name: 'noChallengeOnchain',
  predicate: (context, {finalizesAt}) => finalizesAt === 0
};

// const someOtherChallengeOnchain: Guard<Initial, ChainEvent> = {
//   type: 'xstate.guard',
//   name: 'myTurnNow',
//   predicate: (context, event) => false // TODO: Add challenge state to context
// };

const challengeOnchainAsExpected: Guard<Initial, ChainEvent> = {
  type: 'xstate.guard',
  name: 'challengeOnchainAsExpected',
  predicate: (context, {finalizesAt, finalized}) => finalizesAt > 0 && !finalized
};

const challengeFinalized: Guard<Initial, ChainEvent> = {
  type: 'xstate.guard',
  name: 'challengeFinalized',
  predicate: (context, {finalized}) => finalized
};

const submitChallengeTransaction = (store: Store) => async ({channelId}: Initial) => {
  const {support, myAddress} = await store.getEntry(channelId);
  const privateKey = await store.getPrivateKey(myAddress);
  return await store.chain.challenge(support, privateKey);
};

const observeOnChainChannelStorage = (store: Store, channelId: string) =>
  store.chain.chainUpdatedFeed(channelId).pipe(
    map<ChannelChainInfo, ChainEvent>(({finalized, channelStorage}) => ({
      type: 'CHAIN_EVENT',
      finalized,
      ...channelStorage
    }))
  );

const setTransactionId = assign<Context, DoneInvokeEvent<string>>({
  transactionId: (context, {data}) => data
});

export const machine = (
  store: Store,
  context: Initial
): StateMachine<Context, Schema, Event, Typestate> =>
  createMachine<Context, Event, Typestate>({
    context,

    strict: true,
    id: 'challenge-channel',
    initial: 'init',

    on: {
      CHANNEL_UPDATED: {actions: log('CHANNEL_UPDATED sent to challenge channel machine')},
      CHAIN_EVENT: [
        {
          target: 'waitForResponseOrTimeout',
          cond: challengeOnchainAsExpected
        },
        {
          target: 'done',
          cond: challengeFinalized
        }
      ]
    },

    states: {
      init: {
        // TODO: Figure out how to make invoke work at root-level here. Seems to cause
        // an infinite loop if entry is on the root-level of the machine.
        entry: assign<any>({
          chainWatcher: ({channelId}) => spawn(observeOnChainChannelStorage(store, channelId))
        }),

        on: {
          CHAIN_EVENT: {
            target: 'submitTransaction',
            cond: noChallengeOnchain
          }
        }
      },

      waitForResponseOrTimeout: {},

      submitTransaction: {
        invoke: {
          id: 'submitTransaction',
          src: submitChallengeTransaction(store),
          onDone: {
            target: 'waitMining',
            actions: setTransactionId
          }
          // onError: {target: 'retry'}
        }
      },

      waitMining: {},

      retry: {
        on: {
          USER_APPROVES_RETRY: {target: 'submitTransaction'},
          USER_REJECTS_RETRY: {target: 'failure'}
        }
      },

      done: {
        id: 'done',
        type: 'final'
      },

      failure: {
        id: 'failure',
        type: 'final'
      }
    }
  });
