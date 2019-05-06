import { Model } from 'objection';

export default class WalletProcess extends Model {
  static tableName = 'wallet_processes';

  readonly id!: number;
  process_id!: string;
  their_address!: string;
  protocol!: string;
}
