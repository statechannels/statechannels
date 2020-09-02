import {Wallet, providers, BigNumber} from 'ethers';

import {TransactionSubmissionService, TransactionSubmissionError} from '../transaction-submission';
import config from '../../config';

import {MinimalTransaction} from '..';

const verifyResponse = async (
  response: providers.TransactionResponse,
  tx: MinimalTransaction
): Promise<void> => {
  expect(response.to).toEqual(tx.to);
  expect(response.value?.toString()).toEqual(tx.value?.toString());
  expect(response.data).toEqual(tx.data);
  expect(response.hash).toBeDefined();
  const receipt = await response.wait();
  expect(receipt.transactionHash).toBe(response.hash);
  expect(receipt.to).toBe(response.to);
};

const getTransaction = (overrides: Partial<MinimalTransaction> = {}): MinimalTransaction => {
  return {
    to: Wallet.createRandom().address,
    value: BigNumber.from(10),
    data: '0x00',
    ...overrides,
  };
};

const getFailingWallet = (error?: string): any => {
  return {
    connect: (_provider: providers.JsonRpcProvider): any => {
      return {
        getTransactionCount: (): number => 0,
        sendTransaction: (
          _tx: providers.TransactionRequest
        ): Promise<providers.TransactionResponse> => {
          throw new Error(error || 'Fail');
        },
      };
    },
  };
};

describe('TransactionSubmissionService.submitTransaction', () => {
  let service: TransactionSubmissionService;
  let wallet: Wallet;
  let provider: providers.JsonRpcProvider;

  beforeEach(async () => {
    provider = new providers.JsonRpcProvider(config.rpcEndpoint);
    wallet = new Wallet(config.serverPrivateKey);
    service = new TransactionSubmissionService(provider, wallet);
  });

  it('should fail if provided with 0 attempts', async () => {
    const tx = getTransaction();
    await expect(service.submitTransaction(tx, {maxSendAttempts: 0})).rejects.toEqual(
      new TransactionSubmissionError(TransactionSubmissionError.reasons.zeroAttempts)
    );
  });

  it('should send a transaction successfully', async () => {
    const tx = getTransaction();
    const response = await service.submitTransaction(tx);
    await verifyResponse(response, tx);
  });

  it('should send concurrent transactions successfully', async () => {
    const tx = getTransaction();
    const responses = await Promise.all([
      service.submitTransaction(tx),
      service.submitTransaction(tx),
    ]);
    await Promise.all(responses.map(response => verifyResponse(response, tx)));
  });

  it('should retry transactions with known errors', async () => {
    // Create a "wallet" that forces an error
    const mock = getFailingWallet(TransactionSubmissionError.knownErrors.badNonce);

    // Recreate service
    service = new TransactionSubmissionService(provider, mock as any);

    const tx = getTransaction();
    await expect(service.submitTransaction(tx, {maxSendAttempts: 2})).rejects.toEqual(
      new TransactionSubmissionError(TransactionSubmissionError.reasons.failedAllAttempts)
    );
  });

  it('should not retry transactions with unknown errors', async () => {
    // Create a "wallet" that forces an unrecognized error
    const mock = getFailingWallet();

    // Recreate service
    service = new TransactionSubmissionService(provider, mock);

    const tx = getTransaction();
    await expect(service.submitTransaction(tx, {maxSendAttempts: 2})).rejects.toEqual(
      new TransactionSubmissionError(TransactionSubmissionError.reasons.unknownError)
    );
  });
});
