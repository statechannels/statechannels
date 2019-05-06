import WalletProcess from '../../models/WalletProcess';

export const queries = {
  getProcess,
};

export async function getProcess(processId: string) {
  return WalletProcess.query()
    .where({ process_id: processId })
    .first();
}
