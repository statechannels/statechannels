import {Wallet, providers, BigNumber} from 'ethers';

import {TransactionSubmissionService, TransactionSubmissionError} from '../transaction-submission';

const verifyResponse = async (response: providers.TransactionResponse): Promise<void> => {
  expect(response.hash).toBeDefined();
  const receipt = await response.wait();
  expect(receipt.transactionHash).toBe(response.hash);
  expect(receipt.to).toBe(response.to);
};

describe('TransactionSubmissionService.submitTransaction', () => {
  let service: TransactionSubmissionService;
  let wallet: Wallet;
  let provider: providers.JsonRpcProvider;

  beforeEach(async () => {
    provider = {} as any;
    wallet = {} as any;
    service = new TransactionSubmissionService(provider, wallet);
  });

  it('should fail if provided with 0 attempts', async () => {
    const recipient = Wallet.createRandom();
    const value = BigNumber.from('10');
    expect(
      await service.submitTransaction(
        {to: recipient.address, data: '0x0', value},
        {maxSendAttempts: 0}
      )
    ).toThrow(TransactionSubmissionError.reasons.zeroAttempts);
  });

  it('should send a transaction successfully', async () => {
    const recipient = Wallet.createRandom();
    const value = BigNumber.from('10');
    const response = await service.submitTransaction({to: recipient.address, data: '0x0', value});
    await verifyResponse(response);
  });

  it('should send concurrent transactions successfully', async () => {
    const tx = {
      value: BigNumber.from(10),
      data: '0x0',
      to: Wallet.createRandom().address,
    };
    const responses = await Promise.all([
      service.submitTransaction(tx),
      service.submitTransaction(tx),
    ]);
    await Promise.all(responses.map(verifyResponse));
  });

  // TODO: Is there a better way to force a known error?
  it('should retry transactions with known errors', async () => {
    wallet.sendTransaction = (
      _tx: providers.TransactionRequest
    ): Promise<providers.TransactionResponse> =>
      Promise.reject(TransactionSubmissionError.knownErrors.noHash);

    // Recreate service
    service = new TransactionSubmissionService(provider, wallet);

    const tx = {
      value: BigNumber.from(10),
      data: '0x0',
      to: Wallet.createRandom().address,
    };
    expect(await service.submitTransaction(tx, {maxSendAttempts: 2})).toThrow(
      TransactionSubmissionError.reasons.failedAllAttempts
    );
  });

  it('should not retry transactions with unknown errors', async () => {
    wallet.sendTransaction = (
      _tx: providers.TransactionRequest
    ): Promise<providers.TransactionResponse> => Promise.reject('Failure');

    // Recreate service
    service = new TransactionSubmissionService(provider, wallet);

    const tx = {
      value: BigNumber.from(10),
      data: '0x0',
      to: Wallet.createRandom().address,
    };
    expect(await service.submitTransaction(tx, {maxSendAttempts: 2})).toThrow(
      TransactionSubmissionError.reasons.unknownError
    );
  });
});
