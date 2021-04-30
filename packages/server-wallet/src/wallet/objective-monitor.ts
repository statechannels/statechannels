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

    engineEmitter.on('objectiveStarted', async (o: WalletObjective) => {
      const {objectiveId} = o;
      if (!this.isMonitored(objectiveId)) {
        logger?.trace({objectiveId}, 'Monitoring objective');
        this.monitorObjectives([o]);
        this.emit('newObjective', o);
      }
    });

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
  public isComplete(objectiveId: string): boolean {
    const result = this._objectives.get(objectiveId);
    return result === 'succeeded' || result === 'failed';
  }

  public isMonitored(objectiveId: string): boolean {
    return this._objectives.has(objectiveId);
  }

  public markAsComplete(objectiveId: string, status: 'succeeded' | 'failed' = 'succeeded'): void {
    if (!this._objectives.has(objectiveId)) {
      throw new Error('Cannot update the handling status if the objective is not being monitored');
    } else {
      this._objectives.set(objectiveId, status);
    }
  }

  public monitorObjectives(objectives: WalletObjective[]): void {
    for (const objective of objectives) {
      this._objectives.set(objective.objectiveId, objective.status);
    }
  }

  public destroy(): void {
    this.removeAllListeners();
  }
}
