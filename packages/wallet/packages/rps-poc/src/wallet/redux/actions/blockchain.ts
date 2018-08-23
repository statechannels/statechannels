import { Wallet } from '../..';

export type BlockchainSendTransactionAction = ReturnType<typeof BlockchainAction.sendTransaction>;
export type BlockchainReceiveEventAction = ReturnType<typeof BlockchainAction.receiveEvent>;
export type BlockchainAction = BlockchainSendTransactionAction | BlockchainReceiveEventAction;

export enum BlockchainActionType {
  BLOCKCHAIN_SENDTRANSACTION = 'BLOCKCHAIN.SENDTRANSACTION',
  BLOCKCHAIN_RECEIVEEVENT = 'BLOCKCHAIN.RECEIVEEVENT',
}

export const BlockchainAction = {
  sendTransaction: (transaction: string, wallet: Wallet) => ({
    type: BlockchainActionType.BLOCKCHAIN_SENDTRANSACTION,
    transaction,
    wallet,
  }),
  receiveEvent: (event: any) => ({
    type: BlockchainActionType.BLOCKCHAIN_RECEIVEEVENT,
    event,
  }),
};
