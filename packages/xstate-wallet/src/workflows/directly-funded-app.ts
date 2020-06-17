import {StateMachine, createMachine, Guard} from 'xstate';

import {MessagingServiceInterface} from '../messaging';

import {Store} from '../store';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {ChannelUpdated} from '../event-types';
// import _ from 'lodash';
// import {BigNumber} from 'ethers/utils';

type Initial = {channelId: string}; // from the objective
type Channel = Initial;
// interface Deposit {
//   depositAt: BigNumber;
//   totalAfterDeposit: BigNumber;
//   fundedAt: BigNumber;
// }
// interface Chain {
//   ledgerTotal: BigNumber;
//   lastChangeBlockNum: BigNumber;
//   currentBlockNum: BigNumber;
// }
// interface Transaction {
//   transactionId: string;
// }

// if my signature not present, go to approve
// if post-fund setup not present, go to deposit
//

// what part of the chain do I need to watch?
// definitely the adjudicator
// is it true that we have priority transtitions e.g. finalized is the biggest priority

// entry point state - a sorting state

// waitChannel if no channel
// joining if I haven't signed yet
// depositing if not fully funded (and at preFS)
// wait for postFS if no postFS
// running if turnNum > 3
// respond if challenge exists and you're not the challenger
// challenge if challenge exists and you are the challenger
// closing if one person has sent conclude (?)
// withdrawing if everyone has sent conclude and not defunded
// done if conclusion proof and defunded

// we can sort events into type:
// let's not bother for now

// there needs to be a precedence order

// is it then true that all the important information about the current state is encoded in where I am?
// maybe that's the aim of the state machine... it's a visualization of the important parts of the state
// e.g. the my turn / your turn state

// do we always need to subscribe to chain updates?
// no - in certain states we care about age, and then we can get depth-changed channel updates
// store sends updates. Workflow looks for conditions

// known transactions? <- maybe

type Typestate =
  | {value: 'waitForChannel'; context: Initial}
  | {value: 'funding'; context: Initial}
  | {value: 'running'; context: Initial}
  | {value: 'challenging'; context: Initial}
  | {value: 'responding'; context: Initial}
  | {value: {opening: 'waitForApp'}; context: Channel} // sign state on exit?
  | {value: {opening: 'waitForUserApproval'}; context: Channel} // sign state on exit?
  | {value: {opening: 'signAndSendPreFS'}; context: Channel}
  // | {value: {funding: 'init'}; context: Channel & Deposit}
  // | {value: {funding: 'waitTurn'}; context: Channel & Deposit & Chain}
  // | {value: {funding: 'submitTransaction'}; context: Channel & Deposit & Chain}
  // | {value: {funding: 'retry'}; context: Channel & Deposit & Chain}
  // | {value: {funding: 'waitMining'}; context: Channel & Deposit & Chain & Transaction}
  // | {value: {funding: 'waitFullyFunded'}; context: Channel & Deposit & Chain}
  // | {value: {funding: 'signAndSendPostFS'}; context: Channel}
  // | {value: {running: 'myTurn'}; context: Channel}
  // | {value: {running: 'notMyTurn'}; context: Channel}
  // | {value: {challenging: 'waitForUserConfirmation'}; context: Channel}
  // | {value: {challenging: 'submitTransaction'}; context: Channel}
  // | {value: {challenging: 'retry'}; context: Channel}
  // | {value: {challenging: 'waitMining'}; context: Channel & Chain & Transaction}
  // | {value: {challenging: 'waitForResponseOrTimeout'}; context: Channel}
  // | {value: {responding: 'waitUserConfirmation'}; context: Channel}
  // | {value: {responding: 'waitForResponseOrTimeout'}; context: Channel} // if declined
  // | {value: {responding: 'submitTransaction'}; context: Channel}
  // | {value: {responding: 'retry'}; context: Channel}
  // | {value: {responding: 'waitMining'}; context: Channel}
  | {value: 'concluding'; context: Channel}
  | {value: 'withdrawing'; context: Channel}
  | {value: 'done'; context: Channel}
  | {value: 'failure'; context: Initial};

type Context = Typestate['context'];

// need a clear way of breaking it down

// instruction to close? the app doesn't have to issue an instruction to close if there's a risk
// the app issuing the instruction is saying "I want to close regardless of the future"
// request close / confirm close? done with an objective?

// Off-chain state: setup -(preFS)-> funding -(postFS)-> running -> concluding -> concluded
// Asset Holder state: noFunds / partiallyFundedByOthers / myDepositPending / partiallyFundedIncMe / fullyFunded
// Adjudicator State: open / challenge / finalized / responsePending / challengePending

// Andrew: xstate gives you a way to visualize the logic: what you do and what you're listening for
// the more logic that there is in the machine the easier it is to verify

// close requested [don't currently have this functionality]

const channelStateToMachineState = (state: ChannelStoreEntry) => {
  // conclusion proof + no funds => done
  // conclusion proof + funds => withdrawing
  // challenge exists & is mine => challenging # what about the unfunded case?
  // challenge exists & not mine => responding
  //
  //
  // fully funded & postFS => running (my turn / not my turn)
  // fully funded & no postFS => funding
  // preFS but no funds => funding
  // fully funded => running
  // no preFS => opening
  //
};

const channelUpdateToEvent = (previousChannelState: ChannelStoreEntry, event: ChannelUpdated) => {
  const channelState = event.storeEntry;
};

// Channel Events

// challengeDetected (move from not challenge -> challenge)
// fundingAdded
// stateReceived

// event comes in from store
// subscriber compares to internal cached copy (or to context?)
// triggers a new event, which should result in the context being updated, and the state being updated
// have invariants: state should always match context, and internal cached version

// can we guarantee that the event is always processed synchronously?
// maybe using guards is better <- yes
// not sure whether this is better. It's hard to make hierarchies work.
// Often the highest level is most important, so you need to make sure you don't capture that at a lower level
// maybe you just have to do this

// disadvantages of guards: you have to be careful that you don't handle events unexpectedly.
// we have the property that e.g. `isFunded ` events should always be handled by the running sub-engine
// if you mistakenly handle an `isFunded` event in the finding machine it won't bubble up
// by marking events with their category, you ensure you don't handle them mistakenly

// I want all sub-machines to handle the starting events.
// how does that work? do you automatically process the event in the submachine when you enter?

// or do I transition based on the state on entry?

// things to test:
// every event in every state (or at least events that are possible in that state)
type Event = any;

export const machine = (
  store: Store,
  messagingService: MessagingServiceInterface,
  context: Initial
): StateMachine<Context, any, Event, Typestate> =>
  createMachine<Context, Event, Typestate>({
    id: 'directly-funded-app',
    context,
    initial: 'entry',
    // invoke: subscribeToChannelUpdates(),
    on: {CHANNEL_UPDATED: {actions: storeChannel}},
    states: {
      entry: {
        on: {
          '': [
            {cond: isDefunded, target: 'done'},
            {cond: isFinalized, target: 'withdrawing'},
            {cond: isChallenged, target: 'challenging'},
            {cond: isConcluded, target: 'withdrawing'},
            {cond: isFinished, target: 'concluding'},
            {cond: isFunded, target: 'running'},
            {cond: isOpened, target: 'funding'},
            {cond: isProposed, target: 'opening'},
            {target: 'empty'}
          ]
        }
      },
      empty: {
        on: {CHANNEL_UPDATED: {target: 'entry', actions: storeChannel}}
      },
      opening: {
        initial: 'entry',
        on: {CHANNEL_UPDATED: {cond: notOpening, target: 'entry', actions: storeChannel}},
        states: {
          entry: {
            on: {
              '': [{cond: signedPreFS, target: 'waitForPreFS'}, {target: 'getAppApproval'}]
            }
          },
          getAppApproval: {
            on: {JOIN_CHANNEL: 'getUserApproval'}
          },
          getUserApproval: {
            on: {USER_APPROVES: 'signPreFS'}
          },
          signPreFS: {
            invoke: {
              id: 'signPreFS',
              src: 'signPreFS',
              onDone: {target: 'waitForPreFS'}
            }
          },
          waitForPreFS: {}
        }
      },
      funding: {
        initial: 'entry',
        states: {
          entry: {
            on: {
              '': [
                {cond: notFunding, target: '#directly-funded-app.entry'},
                {cond: fullAmountConfirmed, target: 'waitForPostFS'},
                {cond: myAmountConfirmed, target: 'waitFullyFunded'},
                {cond: myTurnNow, target: 'submitTransaction'},
                {cond: notMyTurnYet, target: 'waitTurn'}
              ]
            }
          },
          waitTurn: {
            on: {
              CHANNEL_UPDATED: 'entry'
            }
          },
          submitTransaction: {
            invoke: {
              id: 'submitTransaction',
              src: 'submitTransaction',
              onDone: {target: 'waitMining'},
              onError: {target: 'retry'}
            }
          },
          retry: {
            on: {
              USER_APPROVES_RETRY: {target: 'submitTransaction'},
              USER_REJECTS_RETRY: {target: '#failure'}
            }
          },
          waitMining: {},
          waitFullyFunded: {},
          waitForPostFS: {}
        }
      },
      running: {
        on: {CHANNEL_UPDATED: {cond: notRunning, target: 'entry', actions: storeChannel}}
      },
      concluding: {
        on: {CHANNEL_UPDATED: {cond: notConcluding, target: 'entry', actions: storeChannel}}
      },
      challenging: {
        on: {CHANNEL_UPDATED: {cond: notChallenging, target: 'entry', actions: storeChannel}}
      },
      withdrawing: {
        on: {CHANNEL_UPDATED: {cond: notWithdrawing, target: 'entry', actions: storeChannel}}
      },
      done: {type: 'final'},
      failure: {type: 'final', id: 'failure'}
    }
  });

const trivialGuard = (name: string): Guard<any, any> => ({
  type: 'xstate.guard',
  name,
  predicate: () => false
});

const isDefunded = trivialGuard('defunded');
const isFinalized = trivialGuard('finalized');
const isChallenged = trivialGuard('challenged');
const isConcluded = trivialGuard('concluded');
const isFinished = trivialGuard('finshed');
const isFunded = trivialGuard('funded');
const isOpened = trivialGuard('opened');
const isProposed = trivialGuard('proposed');
const notOpening = trivialGuard('notOpening');
const notFunding = trivialGuard('notFunding');
const notRunning = trivialGuard('notRunning');
const notConcluding = trivialGuard('notConcluding');
const notWithdrawing = trivialGuard('notWithdrawing');
const notChallenging = trivialGuard('notChallenging');
const signedPreFS = trivialGuard('signedPreFS');
const myAmountConfirmed = trivialGuard('myAmountConfirmed');
const fullAmountConfirmed = trivialGuard('fullAmountConfirmed');
const myTurnNow = trivialGuard('myTurnNow');
const notMyTurnYet = trivialGuard('notMyTurnYet');

const storeChannel = 'storeChannel';
