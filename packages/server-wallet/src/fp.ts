export {Either, left, right} from 'fp-ts/lib/Either';
export {Option, none, some} from 'fp-ts/lib/Option';
import {Protocol, ChannelState, ProtocolResult} from './protocols/state';

type Partitioner<T, PS> = (ps: PS) => T;

export const strictMatch = <PS extends ChannelState, T extends string>(
  partitioner: Partitioner<T, PS>,
  handlers: Record<T, Protocol<PS>>
) => (ps: PS): ProtocolResult => handlers[partitioner(ps)](ps);

export const match = <PS extends ChannelState, T extends string>(
  partitioner: Partitioner<T, PS>,
  handlers: (Partial<Record<T, Protocol<PS>>> & {Default: Protocol<PS>}) | Record<T, Protocol<PS>>
) => (ps: PS): ProtocolResult => {
  const handler = handlers[partitioner(ps)];
  if (handler) {
    return handler(ps);
  } else {
    if ('Default' in handlers) {
      return handlers.Default(ps);
    } else {
      throw new Error('No default handler for non-exhaustive match');
    }
  }
};
