import {Interpreter} from 'xstate';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';
import TinyQueue from 'tinyqueue';

export const DEFAULT_PRIORITY = 1;
class ProcessEntry {
  private _processPriority: number;
  private _processName: string;

  constructor(processName: string, processPriority: number = DEFAULT_PRIORITY) {
    this._processName = processName;
    this._processPriority = processPriority;
  }
  get ProcessName() {
    return this._processName;
  }
  get ProcessPriority() {
    return this._processPriority;
  }
}
// TODO: Should we keep relying on the wallet state machine to manage processes
// or do that in the wallet?
export class ProcessManager {
  private _walletMachine: Interpreter<Wallet.Init, any, Wallet.Events>;
  private _processQueue: TinyQueue<ProcessEntry>;

  constructor(walletMachine: Interpreter<Wallet.Init, any, Wallet.Events>) {
    this._walletMachine = walletMachine;
    this._processQueue = new TinyQueue<ProcessEntry>([], (a, b) => {
      return a.ProcessPriority - b.ProcessPriority;
    });
  }

  addProcess(processName: string, processPriority: number = DEFAULT_PRIORITY) {
    this._processQueue.push(new ProcessEntry(processName, processPriority));
  }

  clearCurrentProcess() {
    this._processQueue.pop();
  }

  get currentProcessName(): string | undefined {
    return this._processQueue.peek()?.ProcessName;
  }

  get currentProcessMachine() {
    return this._walletMachine.state.context.processes.find(p => p.id === this.currentProcessName)
      ?.ref;
  }
}
