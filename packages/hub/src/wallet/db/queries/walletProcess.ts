import {ConcludeInstigated} from '@statechannels/wallet/lib/src/communication';
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

// TODO: This is copied and pasted from @statechannels/wallet; perhaps handle better
// https://github.com/statechannels/monorepo/blob/4f505fa5f63c2ba771206d076c4018695bb47c3b/packages/wallet/src/communication/index.ts#L38-L40
export function getProcessId(action: {protocol: string; channelId: string}) {
  return `${action.protocol}-${action.channelId}`;
}
