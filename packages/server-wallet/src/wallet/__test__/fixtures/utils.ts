import _ from 'lodash';

export type Fixture<T> = (props?: Partial<T>) => T;

export const fixture = function<T>(defaults: T, modifier: Function = x => x): Fixture<T> {
  return (props?: Partial<T>): T => modifier(_.merge(_.cloneDeep(defaults), props));
};
