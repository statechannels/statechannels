import {
  objectiveId,
  Objective,
  OpenChannel,
  CloseChannel,
  SharedObjective,
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

type ObjectiveStatus = 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';

type WalletObjective<O extends Objective> = O & {
  objectiveId: string;
  status: ObjectiveStatus;
  createdAt: Date;
  progressLastMadeAt: Date;
};

export type DBOpenChannelObjective = WalletObjective<OpenChannel>;
export type DBCloseChannelObjective = WalletObjective<CloseChannel>;
export type DBDefundChannelObjective = WalletObjective<DefundChannel>;
export type DBSubmitChallengeObjective = WalletObjective<SubmitChallenge>;

export function isSharedObjective(
  objective: DBObjective
): objective is DBOpenChannelObjective | DBCloseChannelObjective {
  return objective.type === 'OpenChannel' || objective.type === 'CloseChannel';
}

type SupportedObjective = OpenChannel | CloseChannel | SubmitChallenge | DefundChannel;
/**
 * A DBObjective is a wire objective with a status, timestamps and an objectiveId
 *
 * Limited to 'OpenChannel', 'CloseChannel', 'SubmitChallenge' and 'DefundChannel' which are the only objectives
 * that are currently supported by the server wallet
 *
 * TODO: rename to WalletObjective
 */
export type DBObjective =
  | DBOpenChannelObjective
  | DBCloseChannelObjective
  | DBSubmitChallengeObjective
  | DBDefundChannelObjective;

export const toWireObjective = (dbObj: DBObjective): SharedObjective => {
  if (dbObj.type === 'SubmitChallenge' || dbObj.type === 'DefundChannel') {
    throw new Error(
      'SubmitChallenge and DefundChannel objectives are not supported as wire objectives'
    );
  }
  return {
    type: dbObj.type,
    data: dbObj.data,
    participants: dbObj.participants,
  };
};

export class ObjectiveChannelModel extends Model {
  readonly objectiveId!: DBObjective['objectiveId'];
  readonly channelId!: string;

  static tableName = 'objectives_channels';
  static get idColumn(): string[] {
    return ['objectiveId', 'channelId'];
  }
}

export class ObjectiveModel extends Model {
  readonly objectiveId!: DBObjective['objectiveId'];
  readonly status!: DBObjective['status'];
  readonly type!: DBObjective['type'];
  readonly data!: DBObjective['data'];
  createdAt!: Date;
  progressLastMadeAt!: Date;

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

  static async insert(
    objectiveToBeStored: SupportedObjective & {
      status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
    },
    tx: TransactionOrKnex
  ): Promise<DBObjective> {
    const id: string = objectiveId(objectiveToBeStored);

    return tx.transaction(async trx => {
      const model = await ObjectiveModel.query(trx)
        .insert({
          objectiveId: id,
          status: objectiveToBeStored.status,
          type: objectiveToBeStored.type,
          data: objectiveToBeStored.data,
          createdAt: new Date(),
          progressLastMadeAt: new Date(),
        })
        .returning('*')
        .first() // This ensures that the returned object undergoes any type conversion performed during insert
        .onConflict('objectiveId')
        .ignore(); // this avoids a UniqueViolationError being thrown

      // Associate the objective with any channel that it references
      // By inserting an ObjectiveChannel row for each channel
      // Requires objective and channels to exist
      await Promise.all(
        extractReferencedChannels(objectiveToBeStored).map(
          async value =>
            ObjectiveChannelModel.query(trx)
              .insert({objectiveId: id, channelId: value})
              .onConflict(['objectiveId', 'channelId'])
              .ignore() // this makes it an upsert
        )
      );
      return model.toObjective();
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

  static async progressMade(objectiveId: string, tx: TransactionOrKnex): Promise<DBObjective> {
    return (
      await ObjectiveModel.query(tx)
        .findById(objectiveId)
        .patch({progressLastMadeAt: new Date()})
        .returning('*')
        .first()
    ).toObjective();
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
      participants: [],
      data: this.data as any, // Here we will trust that the row respects our types
    };
  }
}
