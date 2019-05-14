import { Model, snakeCaseMappers } from 'objection';

export default class WalletProcess extends Model {
  static tableName = 'wallet_processes';

  readonly id!: number;
  process_id!: string;
  their_address!: string;
  protocol!: string;

  static get columnNameMappers() {
    return snakeCaseMappers();
  }
}
