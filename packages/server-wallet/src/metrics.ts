import {performance, PerformanceObserver, PerformanceEntry} from 'perf_hooks';
import fs from 'fs';

import {defaultConfig} from './config';

if (defaultConfig.timingMetrics) {
  if (defaultConfig.metricsOutputFile) {
    fs.writeFileSync(defaultConfig.metricsOutputFile, '', {flag: 'w'});
  }
  const log = (entry: PerformanceEntry): void => {
    if (defaultConfig.metricsOutputFile) {
      fs.appendFileSync(defaultConfig.metricsOutputFile, JSON.stringify(entry) + '\n');
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  const obs = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      log(entry);
    }
  });
  obs.observe({
    // Record multiple
    entryTypes: ['node', 'measure', 'gc', 'function', 'http2', 'http'],
    buffered: false,
  });
}

// TODO: We should return a sync and an async timer
export const timerFactory = (prefix: string) => async <T>(
  label: string,
  cb: () => Promise<T>
): Promise<T> => time(`${prefix}: ${label}`, cb);

async function time<T>(label: string, cb: () => Promise<T>): Promise<T> {
  if (defaultConfig.timingMetrics) {
    performance.mark(`${label}-start`);
    const result = await cb();
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);

    return result;
  } else {
    return await cb();
  }
}

// GK TODO: unbreak this
// Add DB query metrics
// if (defaultConfig.timingMetrics) {
//   knex
//     .on('query', query => {
//       const uid = query.__knexQueryUid;
//       performance.mark(`${uid}-start`);
//     })
//     .on('query-response', (response, query) => {
//       const uid = query.__knexQueryUid;
//       performance.mark(`${uid}-end`);
//       performance.measure(`query-${query.sql}`, `${uid}-start`, `${uid}-end`);
//     });
// }

/**
 * If timing metrics are turned this will wrap every function in a timerify which results in performance entries being logged
 * @param objectOrFunction The object with functions to wrap
 */
export function recordFunctionMetrics<T>(objectOrFunction: T): T {
  if (defaultConfig.timingMetrics) {
    if (typeof objectOrFunction === 'object') {
      const functionKeys: string[] = Object.keys(objectOrFunction)
        .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(objectOrFunction)))
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        .filter(k => typeof (<any>objectOrFunction)[k] === 'function');

      for (const fk of functionKeys) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (<any>objectOrFunction)[fk] = performance.timerify((<any>objectOrFunction)[fk]);
      }
    } else if (typeof objectOrFunction === 'function') {
      return (performance.timerify(objectOrFunction as any) as unknown) as T;
    }
  }
  return objectOrFunction;
}
