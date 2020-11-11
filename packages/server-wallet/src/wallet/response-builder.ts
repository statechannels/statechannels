import {ChannelResult} from '@statechannels/client-api-schema';
import {Participant, serializeMessage, SignedState} from '@statechannels/wallet-core';

import {Channel} from '../models/channel';
import {DBObjective} from '../models/objective';
import {Outgoing} from '../protocols/actions';
import {mergeChannelResults, mergeOutgoing} from '../utilities/messaging';
import {WALLET_VERSION} from '../version';

import {MultipleChannelOutput, SingleChannelOutput, WalletEvent} from '.';

export interface ResponseBuilder {
  /**
   * Queues channel for notification to user
   */
  channelUpdated: (channel: Channel) => void;

  /**
   * Same as channelUpdated but accepts a channelResult instead of a Channel
   *
   * Plan to deprecate.
   */
  channelUpdatedResult: (channelResult: ChannelResult) => void;

  /**
   * Queues state for sending to opponent
   */
  stateSigned: (state: SignedState, myIndex: number, channelId?: string) => void;

  /**
   * Queues objectives for sending to opponent
   */
  objectiveCreated: (objective: DBObjective) => void;

  /**
   * Queues objectives for approval by the user
   */
  objectiveReceived: (objective: DBObjective) => void;

  /**
   * Queue succeeded objectives, so we can emit events
   */
  objectiveSucceeded: (objective: DBObjective) => void;

  /**
   * Add a GetChannelRequest to outbox for given channelId
   */
  requestGetChannel: (channelId: string, myIndex: number, participants: Participant[]) => void;
}

export class WalletResponse implements ResponseBuilder {
  channelResults: ChannelResult[] = [];
  outbox: Outgoing[] = [];
  objectivesToSend: DBObjective[] = [];
  objectivesToApprove: DBObjective[] = [];
  succeededObjectives: DBObjective[] = [];
  requests: string[] = [];

  static initialize(): WalletResponse {
    return new this();
  }

  channelUpdated(channel: Channel): void {
    this.channelResults.push(channel.channelResult);
  }

  channelUpdatedResult(channelResult: ChannelResult): void {
    this.channelResults.push(channelResult);
  }

  stateSigned(state: SignedState, myIndex: number, channelId?: string): void {
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

  objectiveCreated(objective: DBObjective): void {
    this.objectivesToSend.push(objective);
  }

  objectiveReceived(objective: DBObjective): void {
    this.objectivesToApprove.push(objective);
  }

  objectiveSucceeded(objective: DBObjective): void {
    this.succeededObjectives.push(objective);
  }

  requestGetChannel(channelId: string, myIndex: number, participants: Participant[]): void {
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
      // objectivesToApprove: this.objectivesToApprove, // todo: re-enable
    };
  }
  singleChannelOutput(): SingleChannelOutput {
    if (this.channelResults.length !== 1) {
      throw Error(
        `Response: expected exactly one channelResult. Found ${this.channelResults.length}.`
      );
    }

    return {
      outbox: mergeOutgoing(this.outbox),
      channelResult: this.channelResults[0],
      // objectivesToApprove: this.objectivesToApprove, // todo: re-enable
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
}
