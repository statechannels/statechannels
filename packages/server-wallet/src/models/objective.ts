import {
  objectiveId,
  Objective,
  OpenChannel,
  CloseChannel,
  SharedObjective,
  SubmitChallenge,
  DefundChannel,
  unreachable,
} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';
import _ from 'lodash';

import {WaitingFor} from '../objectives/objective-manager';

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
  waitingFor: WaitingFor;
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
  /**
   * This switch statement is unfortunate but is necessary to avoid a typescript error.
   * It seems that the typescript error is the result of:
   * - The parameter dbObj is a union type.
   * - The return type is a union type.
   * - The return value is constructed by creating an object with type, data, and participants fields.
   * - Typescript considers a return object with "type" OpenChannel and "data" of CloseChannel objective to be a possible return type.
   * - The above object does not belong to the union return type.
   */
  switch (dbObj.type) {
    case 'OpenChannel':
      return {
        type: dbObj.type,
        data: dbObj.data,
        participants: dbObj.participants,
      };
    case 'CloseChannel':
      return {
        type: dbObj.type,
        data: dbObj.data,
        participants: dbObj.participants,
      };
    default:
      unreachable(dbObj);
  }
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
  readonly waitingFor!: DBObjective['waitingFor'];
  // the default value of waitingFor is '', see Nothing.ToWaitFor type
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
      waitingFor: WaitingFor;
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
          waitingFor: objectiveToBeStored.waitingFor,
        })
        // `Model.query(tx).insert(o)` returns `o` by default.
        // The return value is therefore constrained by the type of `Model`.
        // When data is fetched with e.g. `Model.query(tx).findById()`, however,
        // the return type is dictated by the DB schema and driver, defined elsewhere.
        // It is possible for these types to differ:
        // and we are effectively *asserting* that they are the same.
        // So it is important to check that the objects returned by *find* queries
        // are of the same type as `Model`.
        //
        // This is particularly important for `timestamp` columns,
        // which can be inserted as a `Date` or a `string` (without error),
        // but will be parsed into a `Date` when fetched.
        //
        // Chaining `.returning('*').first()` is one way to ensure that the returned object
        // has the same type as a fetched object. But it has a performance cost, and can still
        // lead to a bad type assertion: for example, if o.createdAt were a `string`,
        // by using `.returning('*').first()` that property would in fact be a `Date` when fetched.
        // This could lead to nasty runtime errors not caught at compile-time, because
        // the property would type asserted as a `string`.
        //
        // We use `.returning('*').first()` here because we are ignoring conflicts,
        // and want to know what was "already there" in that case.
        .returning('*')
        .first()
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

  static async forIds(objectiveIds: string[], tx: TransactionOrKnex): Promise<DBObjective[]> {
    const model = await ObjectiveModel.query(tx).findByIds(objectiveIds);
    return model.map(m => m.toObjective());
  }

  static async approve(objectiveId: string, tx: TransactionOrKnex): Promise<DBObjective> {
    return (
      await ObjectiveModel.query(tx)
        .findById(objectiveId)
        .patch({status: 'approved'})
        .returning('*')
        .first()
    ).toObjective();
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

  static async updateWaitingFor(
    objectiveId: string,
    waitingFor: WaitingFor,
    tx: TransactionOrKnex
  ): Promise<DBObjective> {
    return (
      await ObjectiveModel.query(tx)
        .findById(objectiveId)
        .patch({progressLastMadeAt: new Date(), waitingFor})
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
