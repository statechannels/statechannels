import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {providers, Wallet as EtherWallet, Contract, BigNumber} from 'ethers';

import {TransactionSubmissionService} from '../transaction-submission';
import {OnchainService} from '../onchain-service';
// FIXME: replace with
// import {Wallet as ChannelWallet, WalletError as ChannelWalletError} from '@statechannels/server-wallet';
import {Wallet} from '../../../src';
import config from '../../config';
import {TransactionSubmissionStore, OnchainServiceStore} from '../store';

jest.mock('../../../src/wallet');

describe('OnchainTransactionService', () => {
  // Transaction service dependencies
  let transactionService: TransactionSubmissionService;
  let wallet: EtherWallet;
  let provider: providers.JsonRpcProvider;

  // Onchain service dependencies
  let onchainService: OnchainService;
  let channelWallet: Wallet;

  // Contracts
  let ethAssetHolder: Contract;

  // Test values
  // const tokenAddress = constants.AddressZero;
  const channelId = randomChannelId(0);

  beforeEach(async () => {
    provider = new providers.JsonRpcProvider(config.rpcEndpoint);
    wallet = new EtherWallet(config.serverPrivateKey);
    transactionService = new TransactionSubmissionService(
      provider,
      wallet,
      new TransactionSubmissionStore()
    );
    channelWallet = new Wallet();
    onchainService = new OnchainService(provider, new OnchainServiceStore());
    onchainService.attachChannelWallet(channelWallet);
    ethAssetHolder = new Contract(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config.ethAssetHolderAddress!,
      ContractArtifacts.EthAssetHolderArtifact.abi,
      provider
    );
  });

  afterEach(async () => {
    onchainService.detachAllHandlers(ethAssetHolder.address);
  });

  it('should call channel callback when event is emitted for a registered channel', async () => {
    await onchainService.registerChannel(channelId, [ethAssetHolder.address]);

    // Trigger deposit
    const value = BigNumber.from(10);
    const data = ethAssetHolder.interface.encodeFunctionData('deposit', [
      channelId,
      BigNumber.from(0),
      value,
    ]);
    const tx = {
      to: ethAssetHolder.address,
      data,
      value,
    };

    // Send transaction and wait for event
    const p = onchainService.attachHandler(
      ethAssetHolder.address,
      'Deposited',
      _e => {
        return;
      },
      _e => true,
      15_000
    );
    const response = await transactionService.submitTransaction(channelId, tx);
    expect(response.hash).toBeDefined();
    expect(response.data).toBe(data);
    expect(response.to).toBe(ethAssetHolder.address);
    expect(response.value.toString()).toBe(value.toString());
    const receipt = await response.wait();
    expect(receipt.transactionHash).toBe(response.hash);

    // Wait for event
    const emitted = await p;
    expect(emitted).toMatchObject({
      amountDeposited: value,
      destination: channelId,
      destinationHoldings: value,
    });

    // Check mock
    expect(channelWallet.updateChannelFunding).toHaveBeenCalled();
  });

  it('should not fail if channel is already registered', async () => {
    await onchainService.registerChannel(channelId, [ethAssetHolder.address]);
    await expect(
      onchainService.registerChannel(channelId, [ethAssetHolder.address])
    ).resolves.toBeUndefined();
  });
});
