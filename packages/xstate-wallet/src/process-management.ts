import {Interpreter} from 'xstate';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';

// TODO: Should we keep relying on the wallet state machine to manage processes
// or do that in the wallet?
export class ProcessManagement {
  _walletMachine: Interpreter<Wallet.Init, any, Wallet.Events>;
  _currentProcess: string;
  constructor(walletMachine: Interpreter<Wallet.Init, any, Wallet.Events>) {
    this._currentProcess = '';
    this._walletMachine = walletMachine;
  }

  set currentProcess(processName: string) {
    this._currentProcess = processName;
  }
  get currentProcess(): string {
    return this._currentProcess;
  }

  get currentProcessMachine() {
    return this._walletMachine.state.context.processes.find(p => p.id === this._currentProcess)
      ?.ref;
  }
}
