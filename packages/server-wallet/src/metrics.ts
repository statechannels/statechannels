import walletConfig from './config';

// TODO: We should return a sync and an async timer
export const timerFactory = (prefix: string) => async <T>(
  label: string,
  cb: () => Promise<T>
): Promise<T> => time(`${prefix}: ${label}`, cb);

async function time<T>(label: string, cb: () => Promise<T>): Promise<T> {
  if (walletConfig.timingMetrics) {
    console.time(label);
    const result = await cb();
    console.timeEnd(label);
    return result;
  } else {
    return await cb();
  }
}
