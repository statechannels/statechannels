import {
  StateSchema,
  Action,
  StateMachine,
  ActionObject,
  createMachine,
  Guard,
  State as XStateState,
  assign,
  DoneInvokeEvent
} from 'xstate';
import {SiteBudget, Participant, SimpleAllocation, AssetBudget} from '../store/types';

import _ from 'lodash';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {Store, State as ChannelState} from '../store';
import {CHALLENGE_DURATION, ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {checkThat, exists, simpleEthAllocation} from '../utils';
import {sendDisplayMessage, MessagingServiceInterface} from '../messaging';
import {serializeSiteBudget} from '../serde/app-messages/serialize';
import {filter, map, first} from 'rxjs/operators';
import {statesEqual} from '../store/state-utils';

interface ChainEvent {
  type: 'CHAIN_EVENT';
  blockNum: number;
  balance: BigNumber;
}

type Event =
  | {type: 'USER_APPROVES_BUDGET'}
  | {type: 'USER_REJECTS_BUDGET'}
  | {type: 'USER_APPROVES_RETRY'}
  | {type: 'USER_REJECTS_RETRY'}
  | ChainEvent;

interface Initial {
  budget: SiteBudget;
  player: Participant;
  hub: Participant;
  requestId: number;
}
interface LedgerExists extends Initial {
  ledgerId: string;
  ledgerState: ChannelState;
}
interface Deposit {
  depositAt: BigNumber;
  totalAfterDeposit: BigNumber;
  fundedAt: BigNumber;
}

interface Chain {
  ledgerTotal: BigNumber;
  lastChangeBlockNum: number;
  currentBlockNum: number;
}

interface Transaction {
  transactionId: string;
}

type Typestate =
  | {value: 'waitForApproval'; context: Initial}
  | {value: 'createLedger'; context: Initial}
  | {value: 'waitForPreFS'; context: LedgerExists}
  | {value: {deposit: 'init'}; context: LedgerExists & Deposit}
  | {value: {deposit: 'waitTurn'}; context: LedgerExists & Deposit & Chain}
  | {value: {deposit: 'submitTransaction'}; context: LedgerExists & Deposit & Chain}
  | {value: {deposit: 'retry'}; context: LedgerExists & Deposit & Chain}
  | {value: {deposit: 'waitMining'}; context: LedgerExists & Deposit & Chain & Transaction}
  | {value: {deposit: 'waitFullyFunded'}; context: LedgerExists & Deposit & Chain}
  | {value: 'done'; context: LedgerExists}
  | {value: 'failure'; context: Initial};

type Context = Typestate['context'];

export interface Schema extends StateSchema<Context> {
  states: {
    waitForUserApproval: {};
    createLedger: {};
    waitForPreFS: {};
    deposit: {
      states: {
        init: {};
        waitTurn: {};
        submitTransaction: {};
        retry: {};
        waitMining: {};
        waitFullyFunded: {};
      };
    };
    done: {};
    failure: {};
  };
}

export type WorkflowState = XStateState<Context, Event, Schema, Typestate>;

export interface WorkflowActions {
  hideUi: Action<Context, any>;
  displayUi: Action<Context, any>;
  sendResponse: Action<Context, any>;
  sendBudgetUpdated: Action<Context, any>;
}
export type StateValue = keyof Schema['states'];

export const machine = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: Initial
): StateMachine<Context, Schema, Event, Typestate> =>
  createMachine<Context, Event, Typestate>({
    id: 'approve-budget-and-fund',
    context,
    initial: 'waitForUserApproval',
    entry: displayUI(messagingService),
    states: {
      waitForUserApproval: {
        on: {
          USER_APPROVES_BUDGET: {target: 'createLedger'},
          USER_REJECTS_BUDGET: {target: 'failure'}
        }
      },
      createLedger: {
        invoke: {
          id: 'createLedgerStartState',
          src: initializeLedger(store),
          onDone: {target: 'waitForPreFS', actions: setLedgerInfo}
        }
      },
      waitForPreFS: {
        invoke: {
          id: 'subscribeToLedgerUpdates',
          src: notifyWhenPreFSSupported(store),
          onDone: {target: 'deposit', actions: assignDepositingInfo}
        }
      },
      deposit: {
        initial: 'init',
        invoke: {
          id: 'observeChain',
          src: observeLedgerOnChainBalance(store)
        },
        on: {
          CHAIN_EVENT: [
            {target: 'done', actions: assignChainData, cond: fullAmountConfirmed},
            {target: '.waitFullyFunded', actions: assignChainData, cond: myAmountConfirmed}
          ]
        },
        states: {
          init: {
            on: {
              CHAIN_EVENT: [
                {target: 'submitTransaction', actions: assignChainData, cond: priorAmountConfirmed},
                {target: 'waitTurn', actions: assignChainData}
              ]
            }
          },
          waitTurn: {
            on: {
              CHAIN_EVENT: [
                {target: 'submitTransaction', actions: assignChainData, cond: priorAmountConfirmed}
              ]
            }
          },
          submitTransaction: {
            invoke: {
              id: 'submitTransaction',
              src: submitDepositTransaction(store),
              onDone: {target: 'waitMining', actions: setTransactionId}
              // onError: {target: 'retry'}
            }
          },
          retry: {
            on: {
              USER_APPROVES_RETRY: {target: 'submitTransaction'},
              USER_REJECTS_RETRY: {target: '#failure'}
            }
          },
          waitMining: {},
          waitFullyFunded: {}
        }
      },
      done: {
        id: 'done',
        type: 'final',
        entry: [
          hideUI(messagingService),
          sendResponse(messagingService)
          // /* This might be overkill */ actions.sendBudgetUpdated
        ]
      },
      failure: {id: 'failure', type: 'final'}
    }
  });

interface LedgerInitRetVal {
  ledgerId: string;
  ledgerState: ChannelState;
}

const initializeLedger = (store: Store) => async (context: Initial): Promise<LedgerInitRetVal> => {
  const initialOutcome = convertPendingBudgetToAllocation(context);
  const participants = [context.player, context.hub];

  const stateVars = {
    outcome: initialOutcome,
    turnNum: bigNumberify(0),
    isFinal: false,
    appData: '0x0'
  };
  const entry = await store.createChannel(participants, CHALLENGE_DURATION, stateVars);
  await store.setFunding(entry.channelId, {type: 'Direct'});
  await store.setLedger(entry.channelId);

  return {
    ledgerId: entry.channelId,
    ledgerState: entry.latestState
  };
};

const setLedgerInfo = assign<Context, DoneInvokeEvent<LedgerInitRetVal>>({
  ledgerId: (context, event) => event.data.ledgerId,
  ledgerState: (context, event) => event.data.ledgerState
});

function convertPendingBudgetToAllocation({hub, player, budget}: Context): SimpleAllocation {
  // TODO: Eventually we will need to support more complex budgets
  if (Object.keys(budget.forAsset).length !== 1) {
    throw new Error('Cannot handle mixed budget');
  }
  // todo: this throws if the budget is undefined and casts it to a AssetBudget otherwise
  // maybe this should be called assertBudgetExists ??
  const ethBudget = checkThat<AssetBudget>(budget.forAsset[ETH_ASSET_HOLDER_ADDRESS], exists);
  const playerItem = {
    destination: player.destination,
    amount: ethBudget.availableSendCapacity
  };
  const hubItem = {
    destination: hub.destination,
    amount: ethBudget.availableReceiveCapacity
  };
  return simpleEthAllocation([hubItem, playerItem]);
}

const displayUI = (messagingService: MessagingServiceInterface): ActionObject<Context, Event> => ({
  type: 'displayUI',
  exec: () => sendDisplayMessage('Show')
});
const hideUI = (messagingService: MessagingServiceInterface): ActionObject<Context, Event> => ({
  type: 'hideUI',
  exec: () => sendDisplayMessage('Hide')
});

const sendResponse = (
  messagingService: MessagingServiceInterface
): ActionObject<Context, Event> => ({
  type: 'sendResponse',
  exec: context =>
    messagingService.sendResponse(context.requestId, serializeSiteBudget(context.budget))
});

const assignDepositingInfo = assign<Context>({
  // this is inefficient, but if use the other style of xstate assign, the devtools break ...
  depositAt: context => calculateDepositInfo(context).depositAt,
  totalAfterDeposit: context => calculateDepositInfo(context).totalAfterDeposit,
  fundedAt: context => calculateDepositInfo(context).fundedAt
});

const calculateDepositInfo = (context: Context) => {
  const ethBudget = checkThat<AssetBudget>(
    context.budget.forAsset[ETH_ASSET_HOLDER_ADDRESS],
    exists
  );
  const ourAmount = ethBudget.availableSendCapacity;
  const hubAmount = ethBudget.availableSendCapacity;
  const totalAmount = ourAmount.add(hubAmount);

  const depositAt = hubAmount; // hub goes first
  const totalAfterDeposit = totalAmount;
  const fundedAt = totalAmount;
  return {depositAt, totalAfterDeposit, fundedAt};
};

const notifyWhenPreFSSupported = (store: Store) => ({ledgerState, ledgerId}: LedgerExists) =>
  store
    .channelUpdatedFeed(ledgerId)
    .pipe(
      filter(({isSupported}) => isSupported),
      filter(({supported}) => statesEqual(ledgerState, supported)), //store the hash?
      map(() => 'SUPPORTED'),
      first()
    )
    .toPromise();

const observeLedgerOnChainBalance = (store: Store) => ({ledgerId}: LedgerExists) =>
  store.chain.chainUpdatedFeed(ledgerId).pipe(
    map(chainInfo => ({
      type: 'CHAIN_EVENT',
      balance: chainInfo.amount,
      blockNum: chainInfo.blockNum
    }))
  );

// // for now don't wait for any number of blocks (until the chain is reporting blockNum)
const fullAmountConfirmed: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'fullAmountConfirmed',
  predicate: (context, event) => event.balance.gte(context.fundedAt)
};
const priorAmountConfirmed: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'priorAmountConfirmed',
  predicate: (context, event) => event.balance.gte(context.depositAt)
};
const myAmountConfirmed: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'myAmountConfirmed',
  predicate: (context, event) => event.balance.gte(context.totalAfterDeposit)
};

const assignChainData = assign<Context, ChainEvent>({
  ledgerTotal: (context, event: ChainEvent) => event.balance,
  currentBlockNum: (context, event: ChainEvent) => event.blockNum,
  lastChangeBlockNum: (context, event: ChainEvent) =>
    context.ledgerTotal && context.ledgerTotal.eq(event.balance)
      ? context.lastChangeBlockNum
      : event.blockNum
});

const setTransactionId = assign<Context, DoneInvokeEvent<string>>({
  transactionId: (context, event) => event.data
});

const submitDepositTransaction = (store: Store) => async (
  ctx: LedgerExists & Deposit & Chain
): Promise<string | undefined> => {
  const amount = ctx.totalAfterDeposit.sub(ctx.ledgerTotal);
  if (amount.lte(0)) return undefined; // sanity check: we shouldn't be in this state, if this is the case

  return store.chain.deposit(ctx.ledgerId, ctx.ledgerTotal.toHexString(), amount.toHexString());
};
