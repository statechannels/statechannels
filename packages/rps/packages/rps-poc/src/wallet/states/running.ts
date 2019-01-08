import {
  AdjudicatorExists,
  adjudicatorExists,
} from './shared';

// stage
export const RUNNING = 'RUNNING';

export const WAIT_FOR_UPDATE = 'WAIT_FOR_UPDATE';

export interface WaitForUpdate extends AdjudicatorExists {
  type: typeof WAIT_FOR_UPDATE;
  stage: typeof RUNNING;
}

export function waitForUpdate<T extends AdjudicatorExists>(params: T): WaitForUpdate {
  return { type: WAIT_FOR_UPDATE, stage: RUNNING, ...adjudicatorExists(params) };
}

export type RunningState = (
  | WaitForUpdate
);
