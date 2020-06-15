import _ from 'lodash';
export const track = window.analytics?.track ?? _.noop;
export const identify = window.analytics?.identify ?? _.noop;
