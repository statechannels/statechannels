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
