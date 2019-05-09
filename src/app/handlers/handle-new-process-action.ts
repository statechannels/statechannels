import { RelayableAction } from 'magmo-wallet';
export async function handleNewProcessAction(action: RelayableAction) {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.CONCLUDING.CONCLUDE_CHANNEL':
  }
}
