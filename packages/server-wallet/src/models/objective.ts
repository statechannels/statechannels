import {
  objectiveId,
  OpenChannel,
  CloseChannel,
  SharedObjective,
  SubmitChallenge,
  DefundChannel,
} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';
import _ from 'lodash';

type ObjectiveStatus = 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';

/**
 * Objectives that are currently supported by the server wallet (wire format)
 */
export type SupportedWireObjective = OpenChannel | CloseChannel;

export type DBOpenChannelObjective = OpenChannel & {objectiveId: string; status: ObjectiveStatus};
export type DBCloseChannelObjective = CloseChannel & {
  objectiveId: string;
  status: ObjectiveStatus;
};
export type DBDefundChannelObjective = {
  type: 'DefundChannel';
  objectiveId: string;
  status: ObjectiveStatus;
  targetChannelId: string;
};

export type DBSubmitChallengeObjective = {
  targetChannelId: string;
  objectiveId: string;
  status: ObjectiveStatus;
  type: 'SubmitChallenge';
};

export function isSharedObjective(
  objective: DBObjective
): objective is DBOpenChannelObjective | DBCloseChannelObjective {
  return objective.type === 'OpenChannel' || objective.type === 'CloseChannel';
}

/**
 * A DBObjective is a wire objective with a status and an objectiveId
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
  return _.omit(dbObj, ['objectiveId', 'status']);
};

export class ObjectiveModel extends Model {
  readonly objectiveId!: DBObjective['objectiveId'];
  readonly targetChannelId!: DBObjective['targetChannelId'];
  readonly status!: DBObjective['status'];
  readonly type!: DBObjective['type'];
  readonly data?: (DBOpenChannelObjective | DBCloseChannelObjective)['data'];

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
      channel: {
        relation: Model.BelongsToOneRelation,
        modelClass: Channel,
        join: {
          from: 'objectives.target_channel_id',
          to: 'channel.channel_id',
        },
      },
    };
  }

  static async insert(
    objectiveToBeStored: (SupportedWireObjective | SubmitChallenge | DefundChannel) & {
      status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
    },
    tx: TransactionOrKnex
  ): Promise<ObjectiveModel> {
    const id: string = objectiveId(objectiveToBeStored);
    const {type, targetChannelId, status} = objectiveToBeStored;

    // FIXME: Refactor
    return tx.transaction(async trx => {
      const objective = await ObjectiveModel.query(trx).insert({
        status,
        type,
        data: 'data' in objectiveToBeStored ? objectiveToBeStored.data : undefined,
        objectiveId: id,
        targetChannelId,
      });

      return objective;
    });
  }

  static async forId(objectiveId: string, tx: TransactionOrKnex): Promise<DBObjective> {
    const model = await ObjectiveModel.query(tx).findById(objectiveId);
    return model.toObjective();
  }

  static async approve(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await ObjectiveModel.query(tx).findById(objectiveId).patch({status: 'approved'});
  }

  static async succeed(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await ObjectiveModel.query(tx).findById(objectiveId).patch({status: 'succeeded'});
  }
  static async failed(objectiveId: string, tx: TransactionOrKnex): Promise<void> {
    await ObjectiveModel.query(tx).findById(objectiveId).patch({status: 'failed'});
  }

  static async forChannelIds(
    targetChannelIds: string[],
    tx: TransactionOrKnex
  ): Promise<DBObjective[]> {
    return (await ObjectiveModel.query(tx).whereIn('targetChannelId', targetChannelIds)).map(m =>
      m.toObjective()
    );
  }

  toObjective(): DBObjective {
    return {
      ...this,
      participants: [],
      data: JSON.parse(this.data as any), // Here we will trust that the row respects our types
    };
  }
}
