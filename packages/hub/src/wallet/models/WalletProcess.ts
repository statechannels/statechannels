import {Model, snakeCaseMappers} from 'objection';

export default class WalletProcess extends Model {
  static tableName = 'wallet_processes';

  readonly id!: number;
  processId!: string;
  theirAddress!: string;
  protocol!: string;

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  get appChannelId() {
    return this.processId.split('-')[1];
  }
}
