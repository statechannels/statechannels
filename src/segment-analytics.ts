import _ from 'lodash';

/**
 * Segment analytics are injected in index.html
 * This exposes them for ease of use, without having to refer to the window object,
 * or worry about undefined functions
 */

export const track = window.analytics?.track ?? _.noop;
export const identify = window.analytics?.identify ?? _.noop;
