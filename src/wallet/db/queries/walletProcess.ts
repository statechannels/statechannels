import { WalletProtocol } from 'magmo-wallet';
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
  return WalletProcess.fromJson({ processId, theirAddress, protocol: WalletProtocol.Funding })
    .$query()
    .insert()
    .first();
}
