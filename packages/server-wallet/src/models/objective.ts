import {objectiveId, Objective as ObjectiveType} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';

import {ObjectiveStoredInDB} from '../wallet/store';

function extract(objective: Objective): ObjectiveStoredInDB {
  return {
    ...objective,
    participants: [],
    data: objective.data as any, // Here we will trust that the row respects our types
  };
}

export class Objective extends Model {
  readonly objectiveId!: ObjectiveStoredInDB['objectiveId'];
  readonly status!: ObjectiveStoredInDB['status'];
  readonly type!: ObjectiveStoredInDB['type'];
  readonly data!: ObjectiveStoredInDB['data'];

  static tableName = 'objectives';
  static get idColumn(): string[] {
    return ['objectiveId'];
  }

  static async insert(
    objectiveToBeStored: ObjectiveType & {
      status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
    },
    tx: TransactionOrKnex
  ): Promise<Objective> {
    return Objective.query(tx).insert({
      objectiveId: objectiveId(objectiveToBeStored),
      status: objectiveToBeStored.status,
      type: objectiveToBeStored.type,
      data: objectiveToBeStored.data,
    });
  }

  static async forId(objectiveId: string, tx: TransactionOrKnex): Promise<ObjectiveStoredInDB> {
    const objective = await Objective.query(tx).findById(objectiveId);
    return extract(objective);
  }

  static async approve(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await Objective.query(tx)
      .findById(objectiveId)
      .patch({status: 'approved'});
  }

  static async succeed(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await Objective.query(tx)
      .findById(objectiveId)
      .patch({status: 'succeeded'});
  }
}
