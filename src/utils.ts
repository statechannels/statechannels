import {filter, map, flatMap, concatMap} from 'rxjs/operators';
import {from, OperatorFunction} from 'rxjs';

function flatFilter<T>(predicate: (event: T) => boolean | Promise<boolean>) {
  // Observes events in the order that the async predicate resolves
  return flatMap(function(value: T) {
    return from(predicate).pipe(
      filter(Boolean),
      map(() => value)
    );
  });
}

function concatFilter<T>(predicate: (event: T) => boolean | Promise<boolean>) {
  // Observes events in the order that they arrive
  // WARNING: future events will not be observed until previous filter
  // predicates resolve
  return concatMap(function(value: T) {
    return from(predicate).pipe(
      filter(Boolean),
      map(() => value)
    );
  });
}

/*
Because async predicates are not supported by `filter`
*/
export const filterAsync = <T>(
  predicate: (event: T) => boolean | Promise<boolean>,
  type: 'flat' | 'concat' = 'flat'
): OperatorFunction<T, T> => (type === 'flat' ? flatFilter(predicate) : concatFilter(predicate));

export function unreachable(x: never) {
  return x;
}
