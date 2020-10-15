import {FundingStrategy} from '@statechannels/client-api-schema';
import {isOpenChannel, OpenChannel} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';

import {ObjectiveStoredInDB} from '../wallet/store';

function extract(
  objective: OpenChannelObjective | undefined
):
  | (OpenChannel & {
      objectiveId: number;
      status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
    })
  | undefined {
  if (objective === undefined) return undefined;
  return {
    objectiveId: objective.objectiveId,
    status: objective.status,
    type: 'OpenChannel',
    participants: [],
    data: {
      targetChannelId: objective.targetChannelId,
      fundingStrategy: objective.fundingStrategy,
    },
  };
}
export class OpenChannelObjective extends Model {
  readonly objectiveId!: ObjectiveStoredInDB['objectiveId'];
  readonly status!: ObjectiveStoredInDB['status'];
  readonly type!: 'OpenChannel';
  readonly targetChannelId!: string;
  readonly fundingStrategy!: FundingStrategy;

  static tableName = 'open-channel-objectives';
  static get idColumn(): string[] {
    return ['objectiveId'];
  }

  static async insert(
    objectiveToBeStored: ObjectiveStoredInDB,
    tx: TransactionOrKnex
  ): Promise<OpenChannelObjective> {
    if (!isOpenChannel(objectiveToBeStored))
      throw Error(
        'You may only store an OpenChannel objective in the open-channel-objectives tables'
      );
    console.log(
      `inserting objective ${objectiveToBeStored.objectiveId} with target channel ${objectiveToBeStored.data.targetChannelId}`
    );
    return OpenChannelObjective.query(tx).insert({
      objectiveId: objectiveToBeStored.objectiveId,
      status: objectiveToBeStored.status,
      type: 'OpenChannel',
      targetChannelId: objectiveToBeStored.data.targetChannelId,
      fundingStrategy: objectiveToBeStored.data.fundingStrategy,
    });
  }

  static async forTargetChannelId(
    targetChannelId: string,
    tx: TransactionOrKnex
  ): Promise<
    | (OpenChannel & {
        objectiveId: number;
        status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
      })
    | undefined
  > {
    console.log(`getting objective for target channel ${targetChannelId}`);
    const objective = await OpenChannelObjective.query(tx)
      .select()
      .first()
      .where({targetChannelId: targetChannelId});
    if (!objective) return undefined;
    return extract(objective);
  }

  static async forTargetChannelIds(
    targetChannelIds: string[],
    tx: TransactionOrKnex
  ): Promise<
    (
      | (OpenChannel & {
          objectiveId: number;
          status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
        })
      | undefined
    )[]
  > {
    const objectives = await OpenChannelObjective.query(tx)
      .select()
      .whereIn('targetChannelId', targetChannelIds);

    return objectives.map(extract);
  }

  static async forId(
    objectiveId: number,
    tx: TransactionOrKnex
  ): Promise<
    | (OpenChannel & {
        objectiveId: number;
        status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
      })
    | undefined
  > {
    console.log(`getting objective ${objectiveId}`);
    const objective = await OpenChannelObjective.query(tx).findById(objectiveId);
    if (!objective) return undefined;
    return extract(objective);
  }

  static async approve(objectiveId: number, tx: TransactionOrKnex): Promise<void> {
    await OpenChannelObjective.query(tx)
      .findById(objectiveId)
      .patch({status: 'approved'});
  }

  static async succeed(objectiveId: number, tx: TransactionOrKnex): Promise<void> {
    await OpenChannelObjective.query(tx)
      .findById(objectiveId)
      .patch({status: 'succeeded'});
  }
}
