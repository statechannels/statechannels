import _ from 'lodash';

export type Fixture<T> = (props?: Partial<T>) => T;

export const fixture = function<T>(defaults: T): Fixture<T> {
  return (props?: Partial<T>): T => _.merge(_.cloneDeep(defaults), props);
};
