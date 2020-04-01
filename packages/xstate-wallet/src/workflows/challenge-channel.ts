import {Machine, StateNodeConfig, spawn, assign} from 'xstate';
import {flatMap} from 'rxjs/operators';

import {Store} from '../store';
import {ChannelChainInfo} from '../chain';

const WORKFLOW = 'challenge-channel';

export type Init = {channelId: string; challengeSubmitted: false};
export type ChallengeRegistered = {channelId: string; challengeSubmitted: true};

export const machine = (store: Store) => {
  type ChallengeObservation =
    | 'CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED'
    | 'SOME_OTHER_CHALLENGE_ALREADY_EXISTS'
    | 'SAFE_TO_CHALLENGE'
    | 'TIMEOUT_PASSED'
    | 'RESPONSE_OBSERVED';

  /**
   * Helper method for determining what the chain's latest state represents with
   * regards to a particular channelId and our local representation of that channel
   * in our store.
   */
  async function determineChallengeStatus(
    {channelId, challengeSubmitted}: Init | ChallengeRegistered,
    store: Store,
    chainInfo: ChannelChainInfo
  ): Promise<ChallengeObservation> {
    // TODO: This function is starting to look ugly. Split it up?
    const {challenge} = chainInfo;
    if (!challengeSubmitted) {
      // TODO: I think it is possible that the chain is UPDATED
      // _after_ challenge tx is sent to network but before the
      // ChallengeRegistered event is observed, which would cause
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

  const subscribeChainUpdatedFeed = (ctx: Init | ChallengeRegistered) =>
    store.chain
      .chainUpdatedFeed(ctx.channelId)
      .pipe(flatMap(determineChallengeStatus.bind(null, ctx, store)));

  const submitChallengeTransaction = async ({channelId}: Init) => {
    const {
      support,
      myIndex,
      channelConstants: {participants}
    } = await store.getEntry(channelId);
    const privateKey = await store.getPrivateKey(participants[myIndex].signingAddress);
    await store.chain.challenge(support, privateKey);
  };

  const assignChainWatcher = assign<Init & {chainWatcher: any}>({
    chainWatcher: (ctx: Init) => spawn(subscribeChainUpdatedFeed(ctx))
  });

  const config: StateNodeConfig<Init, any, any> = {
    key: WORKFLOW,
    initial: 'idle',
    entry: assignChainWatcher,
    on: {
      CHALLENGE_DEALT_WITH: 'done'
    },
    states: {
      idle: {
        on: {
          SAFE_TO_CHALLENGE: 'submit',
          CHALLENGE_PLACED_ONCHAIN_AS_EXPECTED: {
            target: 'waitForResponseOrTimeout',
            actions: assign<any>({challengeSubmitted: true})
          }
        }
      },
      waitForResponseOrTimeout: {
        on: {
          TIMEOUT_PASSED: 'done',
          RESPONSE_OBSERVED: 'done'
        }
      },
      submit: {
        invoke: {
          src: submitChallengeTransaction,
          onDone: {target: 'idle'},
          onError: 'failure'
        }
      },
      done: {type: 'final'},
      failure: {
        entry: assign<any>({error: () => 'Challenge failed'})
      }
    }
  };

  return Machine(config).withConfig({
    actions: {
      assignChainWatcher
    } as any, // TODO: Figure out why we get a type error here... same in depositing.ts
    services: {submitChallengeTransaction}
  });
};
