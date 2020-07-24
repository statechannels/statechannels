import _ from 'lodash';
export type FixtureProps<T> = {
  [P in keyof T]?: FixtureProps<T[P]>;
};
export type Fixture<T> = (props?: FixtureProps<T>) => T;

export const fixture = function<T>(defaults: T, modifier: Function = _.identity): Fixture<T> {
  return (props?: FixtureProps<T>): T => modifier(_.merge(_.cloneDeep(defaults), props));
};
