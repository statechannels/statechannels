import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';
import {Participant, serializeMessage, SignedState, Outcome} from '@statechannels/wallet-core';
import {Message as WireMessage, SignedState as WireState} from '@statechannels/wire-format';

import {Notice, Outgoing} from '../protocols/actions';
import {Channel} from '../models/channel';
import {DBObjective, isSharedObjective, toWireObjective} from '../models/objective';
import {WALLET_VERSION} from '../version';
import {ChannelState, toChannelResult} from '../protocols/state';

import {WalletEvent, MultipleChannelOutput, SingleChannelOutput, Output} from './types';

/**
 * Used internally for constructing the SingleChannelOutput or MultipleChannelOutput
 * to be returned to the user after a call.
 */
export class WalletResponse {
  _channelResults: Record<string, ChannelResult> = {};
  private queuedMessages: WireMessage[] = [];
  objectivesToApprove: DBObjective[] = [];
  createdObjectives: DBObjective[] = [];
  succeededObjectives: DBObjective[] = [];
  requests: string[] = [];

  static initialize(): WalletResponse {
    return new this();
  }

  /**
   * Queues channel for notification to user
   */
  queueChannel(channel: Channel): void {
    this._channelResults[channel.channelId] = channel.channelResult;
  }

  /**
   * Same as channelUpdated but accepts a channelResult instead of a Channel
   *
   * Plan to deprecate.
   */
  queueChannelResult(channelResult: ChannelResult): void {
    this._channelResults[channelResult.channelId] = channelResult;
  }

  /**
   * Same as queueChannel but accepts a channelState instead of a Channel
   *
   * Plan to deprecate.
   */
  queueChannelState(channelState: ChannelState): void {
    this.queueChannelResult(toChannelResult(channelState));
  }

  /**
   * Queues state for sending to opponent
   */
  queueState(state: SignedState, myIndex: number, channelId?: string): void {
    const myParticipantId = state.participants[myIndex].participantId;
    state.participants.forEach((p, i) => {
      if (i !== myIndex) {
        this.queuedMessages.push(
          serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              signedStates: [state],
            },
            p.participantId,
            myParticipantId,
            channelId
          )
        );
      }
    });
  }

  /**
   * Queues an objective to be sent to the opponent
   */
  queueSendObjective(objective: DBObjective, myIndex: number, participants: Participant[]): void {
    const myParticipantId = participants[myIndex].participantId;
    if (isSharedObjective(objective)) {
      participants.forEach((p, i) => {
        if (i !== myIndex) {
          this.queuedMessages.push(
            serializeMessage(
              WALLET_VERSION,
              {
                walletVersion: WALLET_VERSION,
                objectives: [toWireObjective(objective)],
              },
              p.participantId,
              myParticipantId
            )
          );
        }
      });
    }
  }

  /**
   * Queues objectives for
   * - sending to opponent
   * - notifying the app
   */
  queueCreatedObjective(
    objective: DBObjective,
    myIndex: number,
    participants: Participant[]
  ): void {
    this.createdObjectives.push(objective);

    this.queueSendObjective(objective, myIndex, participants);
  }

  /**
   * Queues objectives for approval by the user
   */
  queueReceivedObjective(objective: DBObjective): void {
    this.objectivesToApprove.push(objective);
  }

  /**
   * Queue succeeded objectives, so we can emit events
   */
  queueSucceededObjective(objective: DBObjective): void {
    this.succeededObjectives.push(objective);
  }

  /**
   * Add a GetChannelRequest to outbox for given channelId
   */
  queueChannelRequest(channelId: string, myIndex: number, participants: Participant[]): void {
    const myParticipantId = participants[myIndex].participantId;

    participants.forEach((p, i) => {
      if (i !== myIndex) {
        this.queuedMessages.push(
          serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              requests: [{type: 'GetChannel', channelId}],
            },
            p.participantId,
            myParticipantId,
            channelId
          )
        );
      }
    });
  }

  /**
   * Add a ProposeLedgerUpdate to outbox for given channelId
   */
  queueProposeLedgerUpdate(
    channelId: string,
    myIndex: number,
    participants: Participant[],
    outcome: Outcome,
    nonce: number
  ): void {
    const myParticipant = participants[myIndex];

    participants.forEach((p, i) => {
      if (i !== myIndex) {
        this.queuedMessages.push(
          serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              requests: [
                {
                  type: 'ProposeLedgerUpdate' as const,
                  channelId,
                  outcome,
                  nonce,
                  signingAddress: myParticipant.signingAddress,
                },
              ],
            },
            p.participantId,
            myParticipant.participantId,
            channelId
          )
        );
      }
    });
  }

  multipleChannelOutput(): MultipleChannelOutput {
    return {
      outbox: mergeOutgoing(this.outbox),
      channelResults: mergeChannelResults(this.channelResults),
      newObjectives: this.createdObjectives,
    };
  }

  /**
   * Returns a SingleChannelOutput
   *
   * @param strict - causes method to throw if > 1 channelResult is found
   *
   * Note: we should get rid of strict and return MultipleChannelOutputs
   * wherever it is used
   */
  singleChannelOutput(strict = true): SingleChannelOutput {
    const numResults = this.channelResults.length;

    if (numResults === 0 || (strict && numResults > 1)) {
      throw Error(
        `Response: expected exactly one channelResult. Found ${this.channelResults.length}.`
      );
    }

    return {
      outbox: mergeOutgoing(this.outbox),
      channelResult: this.channelResults[0],
      newObjective: this.createdObjectives[0],
    };
  }

  updatedChannels(): ChannelResult[] {
    return this.channelResults;
  }

  channelUpdatedEvents(): WalletEvent[] {
    return this.channelResults.map(channelResult => ({
      type: 'channelUpdated' as const,
      value: {
        channelResult,
        outbox: this.outbox, // TODO: doesn't seem like this should be on this event?
        newObjective: this.createdObjectives[0], // TODO: This one neither?
      },
    }));
  }

  public get channelResults(): ChannelResult[] {
    return Object.values(this._channelResults);
  }

  private get outbox(): Outgoing[] {
    return this.queuedMessages.map(m => ({
      method: 'MessageQueued' as const,
      params: m,
    }));
  }

  public static mergeOutgoing(outgoing: Notice[]): Notice[] {
    return mergeOutgoing(outgoing);
  }

  public static mergeOutputs(
    outputs: (SingleChannelOutput | MultipleChannelOutput)[]
  ): MultipleChannelOutput {
    const channelResults = mergeChannelResults(
      outputs.flatMap(m => (isSingleChannelMessage(m) ? [m.channelResult] : m.channelResults))
    );

    const outbox = mergeOutgoing(outputs.flatMap(m => m.outbox));
    const newObjectives = outputs.flatMap(m =>
      isSingleChannelMessage(m) ? (m.newObjective ? [m.newObjective] : []) : m.newObjectives
    );
    return {channelResults, outbox, newObjectives};
  }

  // -------------------------------
  // Convenience methods for testing
  // -------------------------------

  public get _signedStates(): WireState[] {
    return this.queuedMessages.flatMap(wireMessage => wireMessage.data.signedStates || []);
  }
}

// -----------
// Utilities
// -----------

// Merges any messages to the same recipient into one message
// This makes message delivery less painful with the request/response model
export function mergeOutgoing(outgoing: Notice[]): Notice[] {
  if (outgoing.length === 0) return outgoing;

  const senders = outgoing.map(o => o.params.sender);
  const differentSender = new Set(senders).size !== 1;
  // This should never happen but it's nice to have a sanity
  if (differentSender) {
    throw new Error(`Trying to merge outgoing messages with multiple recipients ${senders}`);
  }

  const {sender} = outgoing[0].params;

  const messages = outgoing.map(o => o.params as WireMessage);

  // Note: performance is somewhat important here. A previous version of this added elements
  // one-by-one, sorting at each step. That becomes too slow if you're processing a message
  // with 1000s of states.
  return _.map(
    _.groupBy(messages, o => o.recipient),
    (rcptMsgs, recipient) => {
      const states = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.signedStates || []));
      const requests = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.requests || []));
      const objectives = uniqueAndSorted(rcptMsgs.flatMap(n => n.data.objectives || []));

      return {
        method: 'MessageQueued' as const,
        params: {
          sender,
          recipient,
          data: {
            walletVersion: WALLET_VERSION,
            signedStates: states.length > 0 ? states : undefined,
            requests: requests.length > 0 ? requests : undefined,
            objectives: objectives.length > 0 ? objectives : undefined,
          },
        },
      };
    }
  );
}

function uniqueAndSorted<T>(array: T[]): T[] {
  return _.orderBy(_.uniqWith(array, _.isEqual), ['channelId', 'turnNum'], ['desc', 'asc']);
}

function mergeChannelResults(channelResults: ChannelResult[]): ChannelResult[] {
  const sorted = _.orderBy(channelResults, ['channelId', 'turnNum'], ['desc', 'desc']);

  return _.sortedUniqBy(sorted, a => a.channelId);
}

const isSingleChannelMessage = (output: Output): output is SingleChannelOutput =>
  'channelResult' in output;
