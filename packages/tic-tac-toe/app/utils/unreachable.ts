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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unreachable(x: never, y?: any): any {
  return y || x;
}
