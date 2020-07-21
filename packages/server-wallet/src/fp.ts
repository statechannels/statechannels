export type Left<E extends Error> = {readonly _tag: 'left'; error: E};
export type Right<T> = {readonly _tag: 'right'; result: T};
export type Either<T, E extends Error = Error> = Left<E> | Right<T>;

export const right = <T>(result: T): Right<T> => ({_tag: 'right', result});
export const left = <E extends Error>(error: E): Left<E> => ({_tag: 'left', error});

export type None = {readonly _tag: 'None'};
export type Some<T> = {readonly _tag: 'Some'; value: T};
export type Option<T> = None | Some<T>;

export const none: None = {_tag: 'None'};
export const some = <T>(value: T): Some<T> => ({_tag: 'Some', value});
