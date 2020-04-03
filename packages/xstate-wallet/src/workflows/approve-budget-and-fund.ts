import {
  StateSchema,
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
import {MessagingServiceInterface} from '../messaging';
import {serializeSiteBudget} from '../serde/app-messages/serialize';
import {filter, map, first} from 'rxjs/operators';
import {statesEqual} from '../store/state-utils';
import {ChannelChainInfo} from 'src/chain';

interface ChainEvent {
  type: 'CHAIN_EVENT';
  blockNum: BigNumber;
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
  lastChangeBlockNum: BigNumber;
  currentBlockNum: BigNumber;
}

interface Transaction {
  transactionId: string;
}

type Typestate =
  | {value: 'waitForApproval'; context: Initial}
  | {value: 'createBudgetAndLedger'; context: Initial}
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
    createBudgetAndLedger: {};
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
          USER_APPROVES_BUDGET: {target: 'createBudgetAndLedger'},
          USER_REJECTS_BUDGET: {target: 'failure'}
        }
      },
      createBudgetAndLedger: {
        invoke: {
          id: 'createBudgetAndLedger',
          src: createBudgetAndLedger(store),
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
                {target: 'submitTransaction', actions: assignChainData, cond: myTurnNow},
                {target: 'waitTurn', actions: assignChainData, cond: notMyTurnYet}
              ]
            }
          },
          waitTurn: {
            on: {
              CHAIN_EVENT: [
                {target: 'submitTransaction', actions: assignChainData, cond: myTurnNow}
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

const createBudgetAndLedger = (store: Store) => async (
  context: Initial
): Promise<LedgerInitRetVal> => {
  // create budget
  store.createBudget(context.budget);

  // create ledger
  const initialOutcome = convertPendingBudgetToAllocation(context);
  const participants = [context.player, context.hub];

  const stateVars = {
    outcome: initialOutcome,
    turnNum: bigNumberify(0),
    isFinal: false,
    appData: '0x0'
  };
  const entry = await store.createChannel(participants, CHALLENGE_DURATION, stateVars);
  const ledgerId = entry.channelId;
  await store.setFunding(entry.channelId, {type: 'Direct'});
  await store.setLedger(entry.channelId);
  await store.addObjective({
    type: 'FundLedger',
    participants: participants,
    data: {ledgerId}
  });

  return {
    ledgerId,
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
  exec: () => messagingService.sendDisplayMessage('Show')
});
const hideUI = (messagingService: MessagingServiceInterface): ActionObject<Context, Event> => ({
  type: 'hideUI',
  exec: () => messagingService.sendDisplayMessage('Hide')
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
    map<ChannelChainInfo, ChainEvent>(({amount: balance, blockNum}) => ({
      type: 'CHAIN_EVENT',
      balance,
      blockNum
    }))
  );

// // for now don't wait for any number of blocks (until the chain is reporting blockNum)
const fullAmountConfirmed: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'fullAmountConfirmed',
  predicate: (context, event) => event.balance.gte(context.fundedAt)
};
const myTurnNow: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'myTurnNow',
  predicate: (context, event) =>
    event.balance.gte(context.depositAt) && event.balance.lt(context.totalAfterDeposit)
};
const notMyTurnYet: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'notMyTurnYet',
  predicate: (context, event) => event.balance.lt(context.depositAt)
};
const myAmountConfirmed: Guard<Deposit, ChainEvent> = {
  type: 'xstate.guard',
  name: 'myAmountConfirmed',
  predicate: (context, event) =>
    event.balance.gte(context.totalAfterDeposit) && event.balance.lt(context.fundedAt)
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
  if (amount.lte(0)) {
    // sanity check: we shouldn't be in this state, if this is the case
    throw new Error(
      `Something is wrong! Shouldn't be trying to deposit when the remaining amount is ${amount.toString()}.`
    );
  }

  return store.chain.deposit(ctx.ledgerId, ctx.ledgerTotal.toHexString(), amount.toHexString());
};
