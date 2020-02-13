import {MemoryStore} from './store/memory-store';
import {handleMessage} from './messaging';
import {WorkflowManager} from './workflow-manager';

export class ChannelWallet {
  private workflowManager: WorkflowManager;

  constructor(private store: MemoryStore) {
    this.workflowManager = new WorkflowManager(store);
  }

  public async pushMessage(message) {
    await handleMessage(event, this.workflowManager, this.store);
  }

  public onSendMessage(callback: (message) => void) {
    // todo
  }
}
