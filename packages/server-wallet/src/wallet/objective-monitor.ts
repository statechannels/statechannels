import EventEmitter from 'eventemitter3';
import {Logger} from 'pino';

import {EngineEvent} from '..';
import {ObjectiveStatus, WalletObjective} from '../models/objective';

type EngineEmitter = EventEmitter<
  {
    [key in EngineEvent['type']]: EngineEvent['value'];
  }
>;

type ObjectiveMonitorEvents = {
  newObjective: WalletObjective;
};

/**
 * The ObjectiveMonitor is responsible for monitoring objectives and letting us easily check the status of an objective
 *
 */
export class ObjectiveMonitor extends EventEmitter<ObjectiveMonitorEvents> {
  private _objectives = new Map<string, ObjectiveStatus>();

  public constructor(engineEmitter: EngineEmitter, logger?: Logger) {
    super();

    // Listen for new objectives and make sure we're monitoring them
    engineEmitter.on('objectiveStarted', async (o: WalletObjective) => {
      const {objectiveId} = o;
      if (!this.isMonitored(objectiveId)) {
        logger?.trace({objectiveId}, 'Monitoring objective');
        this.monitorObjectives([o]);
        this.emit('newObjective', o);
      }
    });

    // Listen for objective completed and mark objectives as complete
    engineEmitter.on('objectiveSucceeded', o => {
      const {objectiveId} = o;
      if (this.isMonitored(objectiveId)) {
        if (!this.isComplete(objectiveId)) {
          this.markAsComplete(objectiveId);
          logger?.trace({objectiveId}, 'Objective succeeded');
        }
      }
    });
  }

  /**
   * Returns whether an objective has been completed or not
   * @param objectiveId The id of the objective to check
   * @returns True if the objective status is failed or succeeded, false otherwise
   */
  public isComplete(objectiveId: string): boolean {
    const result = this._objectives.get(objectiveId);
    return result === 'succeeded' || result === 'failed';
  }

  /**
   * Returns whether the ObjectiveMonitor is monitoring a specified objective
   * @param objectiveId The id of the objective to check
   * @returns true if the objective is monitored by the Objective Manager, false otherwise
   */
  public isMonitored(objectiveId: string): boolean {
    return this._objectives.has(objectiveId);
  }

  /**
   * Mark an objective as complete
   * @param objectiveId The id of the objective to update.
   * @param status Either a succeeded or failed status. Defaults to succeeded.
   */
  public markAsComplete(objectiveId: string, status: 'succeeded' | 'failed' = 'succeeded'): void {
    if (!this._objectives.has(objectiveId)) {
      throw new Error('Cannot update the handling status if the objective is not being monitored');
    } else {
      this._objectives.set(objectiveId, status);
    }
  }

  /**
   * Lets the Objective Monitor know that we should watch the objectives for any change of status
   * @param objectives A collection of objectives
   */
  public monitorObjectives(objectives: WalletObjective[]): void {
    for (const objective of objectives) {
      this._objectives.set(objective.objectiveId, objective.status);
    }
  }

  public destroy(): void {
    this.removeAllListeners();
  }
}
