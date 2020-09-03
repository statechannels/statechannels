import {providers, Wallet} from 'ethers';
import PriorityQueue from 'p-queue';
import {Bytes32} from '@statechannels/client-api-schema';

import {
  TransactionSubmissionServiceInterface,
  MinimalTransaction,
  TransactionSubmissionOptions,
  Values,
  TransactionSubmissionStoreInterface,
} from './types';
import {BaseError} from './utils';
import {TransactionSubmissionStore} from './store';

export class TransactionSubmissionError extends BaseError {
  readonly type = BaseError.errors.OnchainError;

  // Errors where transactions will be safely retried
  static readonly knownErrors = {
    badNonce: `the tx doesn't have the correct nonce`,
    invalidNonce: 'Invalid nonce',
    noHash: 'no transaction hash found in tx response',
    underpricedReplacement: 'replacement transaction underpriced',
  } as const;

  // Reasons an error is thrown from the transaction submission
  // service
  static readonly reasons = {
    zeroAttempts: 'Invalid max transaction submission attempt count of 0',
    failedAllAttempts: 'Failed all transaction attempts',
    unknownError: 'Transaction failed with unkown error',
  } as const;
  constructor(
    reason: Values<typeof TransactionSubmissionError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}

export class TransactionSubmissionService implements TransactionSubmissionServiceInterface {
  // Chain provider
  private provider: providers.JsonRpcProvider;

  // Wallet to send transactions
  private wallet: Wallet;

  // Queues to handle transactions
  private queue = new PriorityQueue({concurrency: 1});

  // Storage for transactions
  private store: TransactionSubmissionStoreInterface;

  // Memory tracking wallet nonce to assist with retries
  // TODO: maybe replace with NonceManager?
  private memoryNonce = 0;

  constructor(
    provider: string | providers.JsonRpcProvider,
    wallet: string | Wallet,
    store: TransactionSubmissionStore
  ) {
    this.provider =
      typeof provider === 'string' ? new providers.JsonRpcProvider(provider) : provider;
    this.wallet =
      typeof wallet === 'string'
        ? new Wallet(wallet, this.provider)
        : wallet.connect(this.provider);

    this.store = store;
  }

  public async submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction,
    options: TransactionSubmissionOptions = {}
  ): Promise<providers.TransactionResponse> {
    const attempts = options.maxSendAttempts ?? 1;
    if (attempts === 0) {
      throw new TransactionSubmissionError(TransactionSubmissionError.reasons.zeroAttempts, {
        attempts,
      });
    }

    const indexedErrors: {[k: string]: string} = {};
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await this.queue.add(() => this._sendTransaction(channelId, tx));
        return response;
      } catch (e) {
        // Store the error in memory
        indexedErrors[attempt.toString()] = e.message;

        // Retry IFF known error
        if (
          !TransactionSubmissionError.isKnownErr(
            e.message,
            Object.values(TransactionSubmissionError.knownErrors)
          )
        ) {
          throw new TransactionSubmissionError(TransactionSubmissionError.reasons.unknownError, {
            attempt,
            attempts,
            indexedErrors,
          });
        }
      }
    }

    throw new TransactionSubmissionError(TransactionSubmissionError.reasons.failedAllAttempts, {
      attempts,
      indexedErrors,
    });
  }

  private async _sendTransaction(
    channelId: string,
    tx: MinimalTransaction
  ): Promise<providers.TransactionResponse> {
    // Get the onchain record of wallet nonce
    const chainNonce = await this.wallet.getTransactionCount();

    // Use higher of chain or memory nonce
    const nonce = this.memoryNonce > chainNonce ? this.memoryNonce : chainNonce;

    // Send the transaction
    const nonced = {...tx, nonce};
    await this.store.saveTransactionRequest(channelId, nonced);
    const response = await this.wallet.sendTransaction(nonced);
    await this.store.saveTransactionResponse(channelId, response);
    response
      .wait()
      .then(receipt => this.store.saveTransactionReceipt(channelId, receipt))
      .catch(e => this.store.saveFailedTransaction(channelId, nonced, e.message));

    // Update the memory nonce after sent to mempool
    this.memoryNonce = nonce + 1;
    return response;
  }
}
