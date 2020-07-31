export type Values<E> = E[keyof E];
export abstract class WalletError extends Error {
  static readonly errors = {
    ChannelError: 'ChannelError',
    JoinChannelError: 'JoinChannelError',
    UpdateChannelError: 'UpdateChannelError',
    NonceError: 'NonceError',
    InvariantError: 'InvariantError',
  } as const;

  abstract readonly type: Values<typeof WalletError.errors>;
  static readonly reasons: {[key: string]: string};
  constructor(reason: Values<typeof WalletError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}
function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  // eslint-disable-next-line no-prototype-builtins
  return obj.hasOwnProperty(prop);
}

export function isWalletError(error: any): error is WalletError {
  if (!error?.type) return false;
  if (!(typeof error.type === 'string' || error.type instanceof String)) return false;
  return hasOwnProperty(WalletError.errors, error.type);
}
