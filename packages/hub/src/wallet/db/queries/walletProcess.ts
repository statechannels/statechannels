import {ConcludeInstigated, getProcessId} from '@statechannels/wallet/lib/src/communication';
import {ProcessProtocol} from '../../../constants';
import WalletProcess from '../../models/WalletProcess';

export const queries = {
  getProcess
};

export async function getProcess(processId: string) {
  return WalletProcess.query()
    .findOne({process_id: processId})
    .select();
}

export async function startFundingProcess({
  processId,
  theirAddress
}: {
  processId: string;
  theirAddress: string;
}) {
  return WalletProcess.fromJson({processId, theirAddress, protocol: ProcessProtocol.Funding})
    .$query()
    .insert()
    .first();
}

export async function startConcludeProcess({
  action,
  theirAddress
}: {
  action: ConcludeInstigated;
  theirAddress: string;
}) {
  const processId = getProcessId(action);
  const walletProcess = await getProcess(processId);
  if (walletProcess) {
    console.warn(`Process ${processId} already running`);
    return walletProcess;
  }

  return WalletProcess.fromJson({processId, theirAddress, protocol: ProcessProtocol.Concluding})
    .$query()
    .insert()
    .first();
}
