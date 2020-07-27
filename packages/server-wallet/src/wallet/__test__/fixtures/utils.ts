import _ from 'lodash';
import {StateVariables, Outcome} from '@statechannels/wallet-core';
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
export type Fixture<T> = (props?: DeepPartial<T>) => T;

type Modifier<T, S extends T = T> = (result: T, props?: any) => S;
export const fixture = function<T>(defaults: T, modifier: Modifier<T> = _.identity): Fixture<T> {
  return (props?: DeepPartial<T>): T => modifier(_.merge(_.cloneDeep(defaults), props), props) as T;
};

// We don't want to deep merge outcome
export function overwriteOutcome<T extends StateVariables>(
  result: T,
  props?: {outcome: Outcome}
): T {
  if (props?.outcome) result.outcome = props.outcome;

  return result;
}
