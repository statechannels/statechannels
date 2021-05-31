import _ from 'lodash';

import {ObjectiveStatus, WalletObjective} from '../models/objective';

export type RetryOptions = {
  /**
   * The number of attempts to make.
   */
  numberOfAttempts: number;
  /**
   * The initial delay to use in milliseconds
   */
  initialDelay: number;

  /**
   * The multiple that the delay is multiplied by each time
   */
  multiple: number;
};

export type ObjectiveError = EnsureObjectiveFailed | InternalError;

export type EnsureObjectiveFailed = {
  type: 'EnsureObjectiveFailed';
  numberOfAttempts: number;
};

/**
 * This is the catch-all error that will be returned if some error is thrown and not handled.
 */
export type InternalError = {
  type: 'InternalError';
  error: Error;
};

export type ObjectiveSuccess = {channelId: string; type: 'Success'};

export type ObjectiveDoneResult = ObjectiveSuccess | ObjectiveError;

/**
 * This is what is returned for any objective related API call
 *
 */
export type ObjectiveResult = {
  /**
   * A promise that resolves when the objective is fully completed.
   * This promise will never reject, if an error occurs the promise will return an ObjectiveError
   */
  done: Promise<ObjectiveDoneResult>;
  /**
   * The current status of the objective.
   */
  currentStatus: ObjectiveStatus;
  /**
   * The id of the objective.
   */
  objectiveId: string;

  // The channelId for the objective
  channelId: string;
};

export type WalletEvents = {
  ObjectiveCompleted: WalletObjective;
  ObjectiveProposed: WalletObjective;
};
