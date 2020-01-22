import { ADD_LOGS } from './constants';

export function log(message: any) {
  if (ADD_LOGS) {
    console.log(message);
  }
}
