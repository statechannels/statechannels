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
export type EnsureResult = 'Complete' | EnsureObjectiveFailed;

export type EnsureObjectiveFailed = {
  type: 'EnsureObjectiveFailed';
  numberOfAttempts: number;
};

export type CreateChannelResult = {
  done: Promise<EnsureResult>;
  channelId: string;
};
