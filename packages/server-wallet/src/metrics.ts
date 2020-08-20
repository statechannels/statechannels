export const timerFactory = (prefix: string) => async <T>(
  label: string,
  cb: () => Promise<T>
): Promise<T> => time(`${prefix}: ${label}`, cb);

// eslint-disable-next-line no-process-env
const TIME = !!process.env.TIMING_METRICS;
async function time<T>(label: string, cb: () => Promise<T>): Promise<T> {
  if (TIME) {
    console.time(label);
    const result = await cb();
    console.timeEnd(label);
    return result;
  } else {
    return await cb();
  }
}
