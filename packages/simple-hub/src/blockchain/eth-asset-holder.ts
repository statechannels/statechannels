import AsyncLock from 'async-lock';
import {Contract, ContractFactory, ethers, providers, BigNumber, utils} from 'ethers';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {cHubChainPK, cHubChainDestination} from '../constants';
import {log} from '../logger';
import {NonceManager} from '@ethersproject/experimental';
import {TransactionResponse} from '@ethersproject/providers';
import * as Sentry from '@sentry/node';

const rpcEndpoint = process.env.RPC_ENDPOINT;
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(cHubChainPK, provider);
const nonceManager = new NonceManager(walletWithProvider);
let ethAssetHolder: Contract = null;

const lock = new AsyncLock();

export async function makeDeposits(
  depositsToMake: {
    channelId: string;
    amountToDeposit: BigNumber;
  }[]
) {
  log.info(`makeDeposit: attempting to make ${depositsToMake.length} deposits`);

  await Promise.all(
    depositsToMake.map(depositToMake => {
      log.info(
        `makeDeposit: depositing ${depositToMake.amountToDeposit} to ${depositToMake.channelId}`
      );
      return fund(depositToMake.channelId, depositToMake.amountToDeposit);
    })
  );
  log.info(`makeDepost: making ${depositsToMake.length} deposits`);
}

async function fund(channelID: string, value: BigNumber): Promise<void> {
  if (!ethAssetHolder) {
    const createdEthAssetHolder = await createEthAssetHolder();
    ethAssetHolder = ethAssetHolder ?? createdEthAssetHolder;
  }

  await lock.acquire(channelID, async () => {
    const expectedHeld: BigNumber = await ethAssetHolder.holdings(channelID);
    if (expectedHeld.gte(value)) {
      return;
    }

    log.info(
      {value: value.sub(expectedHeld).toHexString()},
      'submitting deposit transaction to eth asset holder'
    );

    // Gas Price: in theory, it would be nice to use provider.getGasPrice() method to estimate a competitive gas price
    // In practice, getGasPrice() seems to always return 1GWei.
    const tx: TransactionResponse = await ethAssetHolder.deposit(
      channelID,
      expectedHeld.toHexString(),
      value,
      {
        gasPrice: utils.parseUnits('15', 'gwei'),
        value: value.sub(expectedHeld)
      }
    );
    log.info(
      {transaction: {hash: tx.hash, nonce: tx.nonce, from: tx.from}},
      'waiting for tx to be mined'
    );
    await tx.wait();

    log.info({transaction: {hash: tx.hash}}, 'Transaction mined');
    checkBalance();
  });
}

async function createEthAssetHolder() {
  let ethAssetHolderFactory: ContractFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(
      ContractArtifacts.EthAssetHolderArtifact,
      nonceManager
    );
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.CHAIN_NETWORK_ID}`);
    }

    throw err;
  }

  const contract = await ethAssetHolderFactory.attach(process.env.ETH_ASSET_HOLDER_ADDRESS);

  log.info(
    {ETH_ASSET_HOLDER_ADDRESS: process.env.ETH_ASSET_HOLDER_ADDRESS},
    'Connected to eth asset holder'
  );

  return contract;
}

async function checkBalance() {
  const balance = await walletWithProvider.getBalance();
  const threshold = ethers.constants.WeiPerEther;
  if (balance.lt(BigNumber.from(threshold))) {
    Sentry.captureMessage(
      `The hub balance of ${ethers.utils.formatEther(balance)} is below ${ethers.utils.formatEther(
        threshold
      )}. Hub address is ${cHubChainDestination}`
    );
  }
}
