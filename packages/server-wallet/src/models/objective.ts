import {
  objectiveId,
  Objective,
  OpenChannel,
  CloseChannel,
  SubmitChallenge,
  DefundChannel,
} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';
import _ from 'lodash';

function extractReferencedChannels(objective: Objective): string[] {
  switch (objective.type) {
    case 'OpenChannel':
    case 'CloseChannel':
    case 'VirtuallyFund':
    case 'SubmitChallenge':
    case 'DefundChannel':
      return [objective.data.targetChannelId];
    case 'FundGuarantor':
      return [objective.data.guarantorId];
    case 'FundLedger':
    case 'CloseLedger':
      return [objective.data.ledgerId];
    default:
      return [];
  }
}

/**
/**
 * A DBObjective is a wallet-core.Objective that is supported by the server wallet. 
 *
 * Limited to 'OpenChannel', 'CloseChannel', 'SubmitChallenge' and 'DefundChannel'
 */
export type DBObjective = OpenChannel | CloseChannel | SubmitChallenge | DefundChannel;
export class ObjectiveChannelModel extends Model {
  readonly objectiveId!: DBObjective['objectiveId'];
  readonly channelId!: string;

  static tableName = 'objectives_channels';
  static get idColumn(): string[] {
    return ['objectiveId', 'channelId'];
  }
}

export class ObjectiveModel extends Model {
  objectiveId!: DBObjective['objectiveId'];
  readonly status!: DBObjective['status'];
  readonly type!: DBObjective['type'];
  readonly data!: DBObjective['data'];
  // note lack of participants

  static tableName = 'objectives';
  static get idColumn(): string[] {
    return ['objectiveId'];
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static get relationMappings() {
    // Prevent a require loop
    // https://vincit.github.io/objection.js/guide/relations.html#require-loops
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {Channel} = require('./channel');

    return {
      objectivesChannels: {
        relation: Model.ManyToManyRelation,
        modelClass: Channel,
        join: {
          from: 'objectives.objectiveId',
          through: {
            from: 'objectives_channels.objectiveId',
            to: 'objectives_channels.channelId',
          },
          to: 'channels.channelId',
        },
      },
    };
  }

  static async ensure(
    objectiveToBeStored: DBObjective,
    tx: TransactionOrKnex
  ): Promise<DBObjective> {
    objectiveToBeStored.objectiveId = objectiveId(objectiveToBeStored);
    delete (objectiveToBeStored as any).participants; // Note removal of participants field
    return tx.transaction(async trx => {
      const objective = await ObjectiveModel.query(trx)
        .insert(objectiveToBeStored)
        .onConflict('objectiveId') // Do not throw a UniqueViolationError if objective exists
        .ignore(); // TODO: consider usinge merge({chosenSubProperties})

      // Associate the objective with any channel that it references
      // By inserting an ObjectiveChannel row for each channel
      // Requires objective and channels to exist
      await Promise.all(
        extractReferencedChannels(objectiveToBeStored).map(async value =>
          ObjectiveChannelModel.query(trx).insert({
            objectiveId: objectiveToBeStored.objectiveId,
            channelId: value,
          })
        )
      );
      return objective.toObjective();
    });
  }

  static async forId(objectiveId: string, tx: TransactionOrKnex): Promise<DBObjective> {
    const model = await ObjectiveModel.query(tx).findById(objectiveId);
    return model.toObjective();
  }

  static async approve(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await ObjectiveModel.query(tx).findById(objectiveId).patch({status: 'approved'});
  }

  static async succeed(objectiveId: string, tx: TransactionOrKnex): Promise<ObjectiveModel> {
    return ObjectiveModel.query(tx)
      .findById(objectiveId)
      .patch({status: 'succeeded'})
      .returning('*')
      .first();
  }
  static async failed(objectiveId: string, tx: TransactionOrKnex): Promise<ObjectiveModel> {
    return ObjectiveModel.query(tx)
      .findById(objectiveId)
      .patch({status: 'failed'})
      .returning('*')
      .first();
  }

  static async forChannelIds(
    targetChannelIds: string[],
    tx: TransactionOrKnex
  ): Promise<DBObjective[]> {
    const objectiveIds = (
      await ObjectiveChannelModel.query(tx)
        .column('objectiveId')
        .select()
        .whereIn('channelId', targetChannelIds)
    ).map(oc => oc.objectiveId);

    return (await ObjectiveModel.query(tx).findByIds(objectiveIds)).map(m => m.toObjective());
  }

  toObjective(): DBObjective {
    return {
      ...this,
      participants: [], // note reattachment of null participants field
      data: this.data as any, // This is necessary, but messes up the union type
    };
  }
}
