import {Model, TransactionOrKnex} from 'objection';

import {ObjectiveStoredInDB} from '../wallet/store';

export class Objective extends Model {
  readonly objectiveId!: ObjectiveStoredInDB['objectiveId'];
  readonly status!: ObjectiveStoredInDB['status'];
  readonly type!: ObjectiveStoredInDB['type'];
  readonly participants!: string; // JSON.stringify(participants)
  readonly data!: string; // JSON.stringify(data)

  static tableName = 'objectives';
  static get idColumn(): string[] {
    return ['objectiveId'];
  }

  static async insert(
    objectiveToBeStored: ObjectiveStoredInDB,
    tx: TransactionOrKnex
  ): Promise<Objective> {
    return Objective.query(tx).insert({
      objectiveId: objectiveToBeStored.objectiveId,
      status: objectiveToBeStored.status,
      type: objectiveToBeStored.type,
      participants: JSON.stringify(objectiveToBeStored),
      data: JSON.stringify(objectiveToBeStored.data),
    });
  }
}
