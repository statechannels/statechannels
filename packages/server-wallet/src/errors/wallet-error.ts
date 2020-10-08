export type Values<E> = E[keyof E];
export abstract class WalletError extends Error {
  static readonly errors = {
    ChannelError: 'ChannelError',
    ApproveObjectiveError: 'ApproveObjectiveError',
    JoinChannelError: 'JoinChannelError',
    CloseChannelError: 'CloseChannelError',
    UpdateChannelError: 'UpdateChannelError',
    NonceError: 'NonceError',
    StoreError: 'StoreError',
    OnchainError: 'OnchainError',
  } as const;

  abstract readonly type: Values<typeof WalletError.errors>;
  static readonly reasons: {[key: string]: string};
  constructor(
    public readonly reason: Values<typeof WalletError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}
// eslint-disable-next-line @typescript-eslint/ban-types
function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  // eslint-disable-next-line no-prototype-builtins
  return obj.hasOwnProperty(prop);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isWalletError(error: any): error is WalletError {
  if (!error?.type) return false;
  if (!(typeof error.type === 'string' || error.type instanceof String)) return false;
  return hasOwnProperty(WalletError.errors, error.type);
}
