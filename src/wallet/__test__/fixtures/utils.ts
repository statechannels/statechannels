import _ from 'lodash';

export function fixture<T>(defaults: T) {
  return (props?: Partial<T>): T => _.merge(_.cloneDeep(defaults), props);
}
