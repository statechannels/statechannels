import {WalletError, Values} from '../errors/wallet-error';

export interface ApproveObjectiveHandlerParams {
  objectiveId: string;
}

export class ApproveObjectiveError extends WalletError {
  readonly type = WalletError.errors.ApproveObjectiveError;

  static readonly reasons = {
    objectiveNotFound: 'objective not found',
    unimplemented: 'objective not implemented',
  } as const;

  constructor(
    reason: Values<typeof ApproveObjectiveError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}
