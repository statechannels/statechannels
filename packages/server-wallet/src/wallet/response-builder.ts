import {ChannelResult} from '@statechannels/client-api-schema';
import {Participant, serializeMessage, SignedState} from '@statechannels/wallet-core';

import {Channel} from '../models/channel';
import {DBObjective, toWireObjective} from '../models/objective';
import {Outgoing} from '../protocols/actions';
import {mergeChannelResults, mergeOutgoing} from '../utilities/messaging';
import {WALLET_VERSION} from '../version';
import {ChannelState, toChannelResult} from '../protocols/state';

import {MultipleChannelOutput, SingleChannelOutput, WalletEvent} from '.';

export class WalletResponse {
  _channelResults: Record<string, ChannelResult> = {};
  outbox: Outgoing[] = [];
  objectivesToSend: DBObjective[] = [];
  objectivesToApprove: DBObjective[] = [];
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
        this.outbox.push({
          method: 'MessageQueued' as const,
          params: serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              signedStates: [state],
            },
            p.participantId,
            myParticipantId,
            channelId
          ),
        });
      }
    });
  }

  /**
   * Queues objectives for sending to opponent
   */
  queueCreatedObjective(
    objective: DBObjective,
    myIndex: number,
    participants: Participant[]
  ): void {
    const myParticipantId = participants[myIndex].participantId;

    participants.forEach((p, i) => {
      if (i !== myIndex) {
        this.outbox.push({
          method: 'MessageQueued' as const,
          params: serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              objectives: [toWireObjective(objective)],
            },
            p.participantId,
            myParticipantId
          ),
        });
      }
    });
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
        this.outbox.push({
          method: 'MessageQueued' as const,
          params: serializeMessage(
            WALLET_VERSION,
            {
              walletVersion: WALLET_VERSION,
              requests: [{type: 'GetChannel', channelId}],
            },
            p.participantId,
            myParticipantId,
            channelId
          ),
        });
      }
    });
  }

  multipleChannelOutput(): MultipleChannelOutput {
    return {
      outbox: mergeOutgoing(this.outbox),
      channelResults: mergeChannelResults(this.channelResults),
      // objectivesToApprove: this.objectivesToApprove, // TODO: re-enable
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
      // objectivesToApprove: this.objectivesToApprove, // TODO: re-enable
    };
  }

  updatedChannels(): ChannelResult[] {
    return this.channelResults;
  }

  objectiveSucceededEvents(): WalletEvent[] {
    return this.succeededObjectives.map(objective => ({
      type: 'objectiveSucceeded' as const,
      value: {
        channelId: objective.data.targetChannelId,
        objectiveType: objective.type,
      },
    }));
  }

  channelUpdatedEvents(): WalletEvent[] {
    return this.channelResults.map(channelResult => ({
      type: 'channelUpdated' as const,
      value: {
        channelResult,
        outbox: this.outbox, // TODO: doesn't seem like this should be on this event?
      },
    }));
  }

  private get channelResults(): ChannelResult[] {
    return Object.values(this._channelResults);
  }
}
