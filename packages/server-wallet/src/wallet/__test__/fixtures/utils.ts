import _ from 'lodash';
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
export type Fixture<T> = (props?: DeepPartial<T>) => T;

export const fixture = function<T>(defaults: T, modifier: Function = _.identity): Fixture<T> {
  return (props?: DeepPartial<T>): T => modifier(_.merge(_.cloneDeep(defaults), props));
};
