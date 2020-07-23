import {OnType, OffType, SubscribeType, UnsubscribeType} from './events';
import {WalletJsonRpcAPI} from './wallet-api';

/**
 * The generic JsonRPC provider interface that mimics EIP-1193 and the window.ethereum
 * object in the browser. Expectation is bidirectional communication between application
 * and the wallet.
 */
export interface ChannelProviderInterface {
  signingAddress?: string;
  destinationAddress?: string;
  walletVersion?: string;

  send<MethodName extends keyof WalletJsonRpcAPI>(
    method: MethodName,
    params: WalletJsonRpcAPI[MethodName]['request']['params']
  ): Promise<WalletJsonRpcAPI[MethodName]['response']['result']>;

  on: OnType;
  off: OffType;

  subscribe: SubscribeType;
  unsubscribe: UnsubscribeType;
}

/**
 * For environments where the destinationAddress is secret until the wallet is "enabled", such
 * as is the case with MetaMask and its connected accounts feature.
 */
export interface Web3ChannelProviderInterface extends ChannelProviderInterface {
  enable(): Promise<void>;
}

/**
 * For environments where the wallet is furthermore proxied within an iFrame embedded on the
 * application's DOM. This, as opposed to being injected via an extension background script,
 * in which case the "mounting" is effectively done via the background script and not by
 * the application.
 */
// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IFrameChannelProviderInterface extends Web3ChannelProviderInterface {
  mountWalletComponent(url?: string): Promise<void>;
}
