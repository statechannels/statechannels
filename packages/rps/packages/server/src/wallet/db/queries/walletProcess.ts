import {
  ConcludeInstigated,
  getProcessId,
  ProcessProtocol,
} from 'magmo-wallet/lib/src/communication';
import WalletProcess from '../../models/WalletProcess';

export const queries = {
  getProcess,
};

export async function getProcess(processId: string) {
  return WalletProcess.query()
    .where({ process_id: processId })
    .first();
}

export async function startFundingProcess({
  processId,
  theirAddress,
}: {
  processId: string;
  theirAddress: string;
}) {
  return WalletProcess.fromJson({ processId, theirAddress, protocol: ProcessProtocol.Funding })
    .$query()
    .insert()
    .first();
}

export async function startConcludeProcess({
  action,
  theirAddress,
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

  return WalletProcess.fromJson({ processId, theirAddress, protocol: ProcessProtocol.Concluding })
    .$query()
    .insert()
    .first();
}
