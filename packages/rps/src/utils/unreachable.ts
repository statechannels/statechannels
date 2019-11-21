/*
 *  Used for checking that we have all cases in discriminated union:
 *
 *    switch(action.type) {
 *      case 'Open':
 *        // do stuff
 *      case 'Close':
 *        // do stuff
 *      default:
 *        unreachable(action, state);
 *    }
 *
 *  Will give a typescript warning, if any expected action isn't handled.
 *  Will return state, if called with an unexpected action in the wild.
 *
 */
export function unreachable(x: never, y?: any) {
  return y || x;
}
