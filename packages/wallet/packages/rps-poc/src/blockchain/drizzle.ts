import { Drizzle } from 'drizzle';
let drizzle: Drizzle;
export function initDrizzle(store: any, drizzleOptions: any): Drizzle {
  if (!drizzle) {
    drizzle = new Drizzle(drizzleOptions, store);
  }
  return drizzle;
}
export function getDrizzle(): Drizzle {
  return drizzle;
}
