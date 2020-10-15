import {FundingStrategy} from '@statechannels/client-api-schema';
import {isOpenChannel} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';

import {ObjectiveStoredInDB} from '../wallet/store';

export class OpenChannelObjective extends Model {
  readonly objectiveId!: ObjectiveStoredInDB['objectiveId'];
  readonly status!: ObjectiveStoredInDB['status'];
  readonly type!: ObjectiveStoredInDB['type'];
  readonly targetChannelId!: string;
  readonly fundingStrategy!: FundingStrategy;

  static tableName = 'objectives';
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
    return OpenChannelObjective.query(tx).insert({
      objectiveId: objectiveToBeStored.objectiveId,
      status: objectiveToBeStored.status,
      type: objectiveToBeStored.type,
      targetChannelId: objectiveToBeStored.data.targetChannelId,
      fundingStrategy: objectiveToBeStored.data.fundingStrategy,
    });
  }

  static async forId(objectiveId: number, tx: TransactionOrKnex): Promise<ObjectiveStoredInDB> {
    const objective = await OpenChannelObjective.query(tx).findById(objectiveId);
    return {
      objectiveId: objective.objectiveId,
      status: objective.status,
      type: objective.type,
      data: {
        targetChannelId: objective.targetChannelId,
        fundingStrategy: objective.fundingStrategy,
      },
    };
  }
}
