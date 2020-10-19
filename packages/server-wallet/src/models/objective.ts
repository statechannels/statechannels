import {FundingStrategy} from '@statechannels/client-api-schema';
import {CloseLedger, FundGuarantor, FundLedger, VirtuallyFund} from '@statechannels/wallet-core';
import {CloseChannel, OpenChannel} from '@statechannels/wire-format';
import {Model, TransactionOrKnex} from 'objection';

import {ObjectiveStoredInDB} from '../wallet/store';

function extract(objective: Objective): ObjectiveStoredInDB {
  let data: any;
  switch (objective.type) {
    case 'OpenChannel':
      (data as OpenChannel['data']) = {
        targetChannelId: objective.targetChannelId,
        fundingStrategy: objective.fundingStrategy,
      };
      break;
    case 'CloseChannel':
      (data as CloseChannel['data']) = {
        targetChannelId: objective.targetChannelId,
        fundingStrategy: objective.fundingStrategy,
      };
      break;
    case 'CloseLedger':
      (data as CloseLedger['data']) = {
        ledgerId: objective.ledgerId,
      };
      break;
    case 'FundGuarantor':
      (data as FundGuarantor['data']) = {
        jointChannelId: objective.jointChannelId,
        ledgerId: objective.ledgerId,
        guarantorId: objective.guarantorId,
      };
      break;
    case 'VirtuallyFund':
      (data as VirtuallyFund['data']) = {
        targetChannelId: objective.targetChannelId,
        jointChannelId: objective.jointChannelId,
      };
      break;
    case 'FundLedger':
      (data as FundLedger['data']) = {
        ledgerId: objective.ledgerId,
      };
      break;
  }
  return {
    objectiveId: objective.objectiveId,
    status: objective.status,
    type: objective.type,
    participants: [],
    data,
  };
}

export class Objective extends Model {
  readonly objectiveId!: ObjectiveStoredInDB['objectiveId'];
  readonly status!: ObjectiveStoredInDB['status'];
  readonly type!: ObjectiveStoredInDB['type'];
  readonly targetChannelId!: string;
  readonly fundingStrategy!: FundingStrategy;
  readonly ledgerId!: string;
  readonly jointChannelId!: string;
  readonly guarantorId!: string;

  static tableName = 'close-channel-objectives';
  static get idColumn(): string[] {
    return ['objectiveId'];
  }

  static async insert(
    objectiveToBeStored: ObjectiveStoredInDB,
    tx: TransactionOrKnex
  ): Promise<Objective> {
    switch (objectiveToBeStored.type) {
      case 'OpenChannel':
      case 'CloseChannel':
        return Objective.query(tx).insert({
          objectiveId: objectiveToBeStored.objectiveId,
          status: objectiveToBeStored.status,
          type: 'CloseChannel',
          targetChannelId: objectiveToBeStored.data.targetChannelId,
          fundingStrategy: objectiveToBeStored.data.fundingStrategy,
        });
      default:
        throw Error('[unimplemented] You may only store a CloseChannel or OpenChannel objective');
    }
  }

  static async forTargetChannelId(
    targetChannelId: string,
    tx: TransactionOrKnex
  ): Promise<ObjectiveStoredInDB> {
    const objective = await Objective.query(tx)
      .select()
      .first()
      .where({targetChannelId: targetChannelId});
    return extract(objective);
  }

  static async forTargetChannelIds(
    targetChannelIds: string[],
    tx: TransactionOrKnex
  ): Promise<ObjectiveStoredInDB[]> {
    const objectives = await Objective.query(tx)
      .select()
      .whereIn('targetChannelId', targetChannelIds);

    return objectives.map(extract);
  }

  static async forId(objectiveId: number, tx: TransactionOrKnex): Promise<ObjectiveStoredInDB> {
    const objective = await Objective.query(tx).findById(objectiveId);
    return extract(objective);
  }

  static async approve(objectiveId: number, tx: TransactionOrKnex): Promise<void> {
    await Objective.query(tx)
      .findById(objectiveId)
      .patch({status: 'approved'});
  }

  static async succeed(objectiveId: number, tx: TransactionOrKnex): Promise<void> {
    await Objective.query(tx)
      .findById(objectiveId)
      .patch({status: 'succeeded'});
  }
}
