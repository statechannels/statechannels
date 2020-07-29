import {OnType, OffType, SubscribeType, UnsubscribeType} from './events';
import {WalletJsonRpcAPI} from './wallet-api';

/**
 * The generic JsonRPC provider interface that mimics {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP-1193} and the window.ethereum
 * object in the browser.
 *
 * @remarks
 * Expectation is bidirectional communication between application
 * and the wallet.
 *
 * @beta
 */
export interface ChannelProviderInterface {
  /**
   * The public part of the ephemeral key pair used for signing state channel updates.
   */
  signingAddress?: string;
  /**
   * The ethereum address where on-chain funds will be sent.
   */
  destinationAddress?: string;
  /**
   * The ethereum address where on-chain funds will be sent.
   */
  walletVersion?: string;

  /**
   * Method for sending requests to the wallet
   */
  send<MethodName extends keyof WalletJsonRpcAPI>(
    method: MethodName,
    params: WalletJsonRpcAPI[MethodName]['request']['params']
  ): Promise<WalletJsonRpcAPI[MethodName]['response']['result']>;

  /**
   * eventemitter 'on' for JSON-RPC Notifications. Use this to register callbacks.
   */
  on: OnType;
  /**
   * eventemitter 'off' for JSON-RPC Notifications. Use this to unregister callbacks.
   */
  off: OffType;

  subscribe: SubscribeType;
  unsubscribe: UnsubscribeType;
}

/**
 * For environments where the destinationAddress is secret until the wallet is "enabled".
 *
 * @remarks
 * This is the case e.g. with {@link https://docs.metamask.io/guide/ethereum-provider.html#table-of-contents | MetaMask } and its connected accounts feature.
 *
 * @beta
 */
export interface Web3ChannelProviderInterface extends ChannelProviderInterface {
  /**
   * Enable the wallet, causing it to run the Ethereum Enable workflow
   */
  enable(): Promise<void>;
}

/**
 * For environments where the wallet is proxied within an iFrame embedded on the
 * application's DOM.
 *
 * @remarks
 * This is as opposed to being injected via an extension background script,
 * in which case the "mounting" is effectively done via the background script and not by
 * the application.
 * @beta
 */
// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IFrameChannelProviderInterface extends Web3ChannelProviderInterface {
  /**
   * Trigger the mounting of the <iframe/> element which loads the wallet.
   */
  mountWalletComponent(url?: string): Promise<void>;
}
