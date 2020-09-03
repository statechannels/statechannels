import {providers, Wallet} from 'ethers';
import PriorityQueue from 'p-queue';

import {
  TransactionSubmissionServiceInterface,
  MinimalTransaction,
  TransactionSubmissionOptions,
} from './types';

// FIXME: replace with
// import {WalletError as ChannelWalletError} from '@statechannels/server-wallet';
import {WalletError as ChannelWalletError} from '..';

type Values<E> = E[keyof E];

export class TransactionSubmissionError extends ChannelWalletError {
  readonly type = ChannelWalletError.errors.OnchainError;

  // Errors where transactions will be safely retried
  static readonly knownErrors = {
    badNonce: `the tx doesn't have the correct nonce`,
    invalidNonce: 'Invalid nonce',
    noHash: 'no transaction hash found in tx response',
    underpricedReplacement: 'replacement transaction underpriced',
  };

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

  // Memory tracking wallet nonce to assist with retries
  // TODO: maybe replace with NonceManager?
  private memoryNonce = 0;

  constructor(provider: string | providers.JsonRpcProvider, wallet: string | Wallet) {
    this.provider =
      typeof provider === 'string' ? new providers.JsonRpcProvider(provider) : provider;
    this.wallet =
      typeof wallet === 'string'
        ? new Wallet(wallet, this.provider)
        : wallet.connect(this.provider);
  }

  public async submitTransaction(
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
        const response = await this.queue.add(() => this._sendTransaction(tx));
        return response;
      } catch (e) {
        // Store the error in memory
        indexedErrors[attempt.toString()] = e.message;

        // Retry IFF known error
        const knownErr = Object.values(TransactionSubmissionError.knownErrors).find(err =>
          e.message.includes(err)
        );
        if (!knownErr) {
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

  private async _sendTransaction(tx: MinimalTransaction): Promise<providers.TransactionResponse> {
    // Get the onchain record of wallet nonce
    const chainNonce = await this.wallet.getTransactionCount();

    // Use higher of chain or memory nonce
    const nonce = this.memoryNonce > chainNonce ? this.memoryNonce : chainNonce;

    // Send the transaction
    const response = await this.wallet.sendTransaction(tx);

    // Update the memory nonce after sent to mempool
    this.memoryNonce = nonce + 1;
    return response;
  }
}
