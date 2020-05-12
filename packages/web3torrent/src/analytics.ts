import _ from 'lodash';
export const track = (window.analytics && window.analytics.track) || _.noop;
