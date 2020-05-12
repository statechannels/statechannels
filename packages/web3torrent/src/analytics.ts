import _ from 'lodash';
export const track = (window.analytics && window.analytics.track) || _.noop;
export const identify = (window.analytics && window.analytics.identify) || _.noop;
