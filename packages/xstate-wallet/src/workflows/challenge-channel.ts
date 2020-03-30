import {Machine, StateNodeConfig, spawn, assign} from 'xstate';
import {map} from 'rxjs/operators';

import {Store} from '../store';
import {ChannelChainInfo} from '../chain';

const WORKFLOW = 'challenge-channel';

export type Init = {channelId: string};

export const config: StateNodeConfig<Init, any, any> = {
  key: WORKFLOW,
  initial: 'idle',
  entry: 'assignChainWatcher',
  on: {CHALLENGE_ONCHAIN_SUCCESSFULLY: 'done'},
  states: {
    idle: {on: {SAFE_TO_CHALLENGE: 'submit'}},
    submit: {invoke: {src: 'submitChallengeTransaction', onDone: 'idle', onError: 'failure'}},
    done: {type: 'final'},
    failure: {entry: assign<any>({error: () => 'Challenge failed'})}
  }
};

type SafeToChallenge = {type: 'SAFE_TO_CHALLENGE'};

export const machine = (store: Store) => {
  const subscribeChallengeRegisteredEvent = (ctx: Init) =>
    store.chain.chainUpdatedFeed(ctx.channelId).pipe(
      map((chainInfo: ChannelChainInfo):
        | 'CHALLENGE_ONCHAIN_SUCCESSFULLY'
        | 'UNEXPECTED_CHALLENGE_ALREADY_EXISTS'
        | SafeToChallenge => {
        if (chainInfo.finalized) return 'CHALLENGE_ONCHAIN_SUCCESSFULLY';
        // if (typeof chainInfo.challenge !== 'undefined') {
        //   const state = await store.getEntry(ctx.channelId);
        //   if (chainInfo.challenge.state.turnNum === state.latestState.turnNum) {
        //     return 'CHALLENGE_ONCHAIN_SUCCESSFULLY';
        //   } else {
        //     return 'UNEXPECTED_CHALLENGE_ALREADY_EXISTS';
        //   }
        // }
        else return {type: 'SAFE_TO_CHALLENGE'};
      })
    );

  const submitChallengeTransaction = async (ctx: Init) => {
    const txRequest = await store.getForceMoveTransactionData(ctx.channelId);
    await store.chain.challenge(ctx.channelId, txRequest);
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
