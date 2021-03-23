import _ from 'lodash';

/*
Segment analytics are injected in index.html
This exposes them for ease of use, without having to refer to the window object,
or worry about undefined functions
Since segment re-defines window.analytics after it's been loaded, at runtime,
we need to make sure we're referring to the fresh ones.
So, we intercept calls to track/identify, and fetch the latest window.analytics value
*/

type Action = 'track' | 'identify';
const segmentFunction = (action: 'track' | 'identify') =>
  window.analytics ? window.analytics[action] : _.noop;

export const analytics: Pick<SegmentAnalytics.AnalyticsJS, Action> = {
  track: (event, ...args) => segmentFunction('track')(event, ...args),
  identify: (event, ...args) => segmentFunction('identify')(event, ...args)
};

const {track, identify} = analytics;
export {track, identify};
