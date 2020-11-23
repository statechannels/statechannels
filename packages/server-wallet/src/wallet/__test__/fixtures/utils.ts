import _ from 'lodash';
import { StateVariables, Outcome } from '@statechannels/wallet-core';
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

type Modifier<T, S extends T = T> = (result: T, props?: any) => S;

/**
 * A fixture accepts two optional, positional arguments
 * - the first, mergeProps, will merge properties into the defaults
 * - the second, extendProps, will overwrite properties of the defaults
 *
 * An example of a property that you wouldn't want to merge is if you want to set a property
 * to `undefined`. In this case, merging the defaults {foo: {bar: 'baz'}} into {foo: undefined}
 * will result in {foo: {bar: 'baz'}}, but extending {foo: undefined} by the defaults
 * {foo: {bar: 'baz'}} will yield {foo: undefined}
 */
export type Fixture<T> = (mergeProps?: DeepPartial<T>, extendProps?: DeepPartial<T>) => T;

/**
 * a fixture factory that produces a fixture, given a set of default values
 * @param defaults default values provided by the fixture
 * @param modifier a generic function that can modify the resulting value returned by the fixture
 *
 * Example
 * ```
 * const defaultState: StateWithHash = {...}
 * const stateWithHashFixture = fixture(defaultState, flow(overwriteOutcome, addHash))
 * ```
 * - If the consumer wishes to specify `outcome`, which is an array, they probably do not
 *   want to merge the provided outcome with the default outcome.
 *   Thus, we probably want to overwrite with the providedoutcome after constructing the object.
 * - If the consumer provided a state hash, it is probably incorrect, since the properties
 *   provided will be mixed with the default properties, which changes the state, yielding
 *   a different state hash
 *
 * Note that the consumer could specify `outcome` as an extend prop, but overwriting the outcome
 * is probably what the consumer expects, and doing it in the modifier serves as a convenience for
 * developers who wish to pass a single `mergeProps` object.
 */
export const fixture = function <T>(defaults: T, modifier: Modifier<T> = _.identity): Fixture<T> {
  return (mergeProps?: DeepPartial<T>, extendProps?: DeepPartial<T>): T =>
    modifier(_.extend(_.merge(_.cloneDeep(defaults), mergeProps), extendProps), mergeProps) as T;
};

// We don't want to deep merge outcomes
// TODO: Should we just make the default outcome empty, making this function unnecessary?
export function overwriteOutcome<T extends StateVariables>(
  result: T,
  props?: { outcome: Outcome }
): T {
  if (props?.outcome) result.outcome = props.outcome;

  return result;
}
