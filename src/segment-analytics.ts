import _ from 'lodash';

/**
 * Segment analytics are injected in index.html
 * This exposes them for ease of use, without having to refer to the window object,
 * or worry about undefined functions
 */

// TODO: Why are SegmentAnalytics types not usable?
const analytics: {
  track(
    event: string,
    properties?: Record<string, any>,
    options?: any,
    callback?: () => void
  ): void;
  identify(userId: string, callback?: () => void): void;
} = (window as any).analytics ?? {};

export const track = analytics.track ?? _.noop;
export const identify = analytics.identify ?? _.noop;
