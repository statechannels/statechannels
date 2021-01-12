import {Logger} from 'pino';

import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';
import {recordFunctionMetrics} from '../metrics';
import {Channel} from '../models/channel';

import * as ProcessLedgerQueue from './process-ledger-queue';

interface LedgerManagerParams {
  store: Store;
  logger: Logger;
  timingMetrics: boolean;
}

export class LedgerManager {
  private store: Store;
  private logger: Logger;
  private timingMetrics: boolean;

  static create(params: LedgerManagerParams): LedgerManager {
    return new this(params);
  }

  private constructor({store, logger, timingMetrics}: LedgerManagerParams) {
    this.store = store;
    this.logger = logger;
    this.timingMetrics = timingMetrics;
  }

  async crank(ledgerChannelId: string, response: WalletResponse): Promise<boolean> {
    let requiresAnotherCrankUponCompletion = false;
    let ledgerFullyProcessed = false;

    while (!ledgerFullyProcessed) {
      await this.store.lockApp(ledgerChannelId, async (tx, channel) => {
        const setError = (e: Error) => tx.rollback(e);

        const markLedgerAsProcessed = () => (ledgerFullyProcessed = true);

        // TODO: Move these checks inside the DB query when fetching ledgers to process
        if (!channel.protocolState.supported || channel.protocolState.supported.turnNum < 3) {
          markLedgerAsProcessed();
          return;
        }

        const protocolState = await ProcessLedgerQueue.getProcessLedgerQueueProtocolState(
          this.store,
          ledgerChannelId,
          tx
        );
        const action = recordFunctionMetrics(
          ProcessLedgerQueue.protocol(protocolState),
          this.timingMetrics
        );

        if (!action) {
          markLedgerAsProcessed();
          if (!requiresAnotherCrankUponCompletion) {
            // pessimistically add state and proposal to outbox
            const {
              fundingChannel: {myIndex, channelId, participants, latestSignedByMe, supported},
              myLedgerProposal: {proposal, nonce},
            } = protocolState;
            if (latestSignedByMe && supported) {
              /**
               * Always re-send a proposal if I have one withstanding, just in case.
               */
              if (proposal)
                response.queueProposeLedgerUpdate(
                  channelId,
                  myIndex,
                  participants,
                  proposal,
                  nonce
                );
              /**
               * Re-send my latest signed ledger state if it is not supported yet.
               */
              if (latestSignedByMe.turnNum > supported.turnNum)
                response.queueState(latestSignedByMe, myIndex, channelId);
            }
          }

          response.queueChannelState(protocolState.fundingChannel);
        } else {
          try {
            switch (action.type) {
              case 'DismissLedgerProposals': {
                await this.store.removeLedgerProposals(ledgerChannelId, tx);
                requiresAnotherCrankUponCompletion = true;
                return;
              }

              case 'SignLedgerUpdate': {
                const {myIndex, channelId} = protocolState.fundingChannel;
                const channel = await Channel.forId(channelId, tx);
                const signedState = await this.store.signState(channel, action.stateToSign, tx);
                response.queueState(signedState, myIndex, channelId);
                return;
              }

              case 'ProposeLedgerUpdate': {
                // NOTE: Proposal added to response in pessimisticallyAddStateAndProposalToOutbox
                await this.store.storeLedgerProposal(
                  action.channelId,
                  action.outcome,
                  action.nonce,
                  action.signingAddress,
                  tx
                );
                return;
              }

              case 'MarkInsufficientFunds': {
                await this.store.markLedgerRequests(action.channelsNotFunded, 'fund', 'failed', tx);
                return;
              }

              case 'MarkLedgerFundingRequestsAsComplete': {
                const {fundedChannels, defundedChannels, ledgerChannelId} = action;

                /**
                 * After we have completed some funding requests (i.e., a new ledger state
                 * has been signed), we can confidently clear now-stale proposals from the DB.
                 */
                await this.store.removeLedgerProposals(ledgerChannelId, tx);

                await this.store.markLedgerRequests(fundedChannels, 'fund', 'succeeded', tx);
                await this.store.markLedgerRequests(defundedChannels, 'defund', 'succeeded', tx);

                requiresAnotherCrankUponCompletion = true;
                return;
              }
              default:
                throw 'Unimplemented';
            }
          } catch (err) {
            this.logger.error({err}, 'Error handling action');
            await setError(err);
          }
        }
      });
    }
    return requiresAnotherCrankUponCompletion;
  }
}
