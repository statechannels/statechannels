import { Channel } from 'fmg-core';
import { INITIALIZATION_SUCCESS, INITIALIZATION_FAILURE, CHANNEL_OPENED, ChannelOpened, FUNDING_FAILURE, FUNDING_SUCCESS, FundingResponse, SIGNATURE_FAILURE, SIGNATURE_SUCCESS, SignatureResponse, VALIDATION_SUCCESS, VALIDATION_FAILURE, ValidationResponse, messageRequest, MESSAGE_REQUEST, SHOW_WALLET, HIDE_WALLET, CONCLUDE_FAILURE, CONCLUDE_SUCCESS } from './interface/from-wallet';
import { openChannelRequest, initializeRequest, fundingRequest, signatureRequest, validationRequest, receiveMessage, concludeChannelRequest, createChallenge, respondToChallenge } from './interface/to-wallet';
import BN from 'bn.js';
import { WalletEventListener } from '.';

/**
 * 
 * @param iframeId The id to create the iFrame with
 * @param walletUrl The url of the hosted wallet
 * @returns {HTMLIFrameElement} The iframe
 */
export function createWalletIFrame(iframeId: string, walletUrl: string): HTMLIFrameElement {
  const iFrame = document.createElement("iframe");
  iFrame.src = walletUrl;
  iFrame.id = iframeId;
  iFrame.style.display = 'none';
  iFrame.style.position = 'absolute';
  iFrame.style.left = '0px';
  iFrame.style.right = '0px';
  iFrame.style.bottom = '0px';
  iFrame.style.top = '0px';
  iFrame.width = '0';
  iFrame.height = '0';
  iFrame.style.zIndex = '9999';

  iFrame.setAttribute('allowtransparency', 'true');

  window.addEventListener('message', (event => {
    if (event.data && event.data.type && event.data.type === SHOW_WALLET) {
      iFrame.style.display = 'initial';
      document.body.style.overflow = 'hidden';
      iFrame.width = '100%';
      iFrame.height = '100%';
    }
    if (event.data && event.data.type && event.data.type === HIDE_WALLET) {
      iFrame.style.display = 'none';
      document.body.style.overflow = 'initial';
      iFrame.width = '0';
      iFrame.height = '0';

    }
  }));
  return iFrame;
}


/**
 * Initialized the wallet with a given user id.
 * The promise resolves when the wallet is initialized or an error occurs
 * The promise returns the wallet address.
 */
export async function initializeWallet(iFrameId: string, userId: string): Promise<string> {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = initializeRequest(userId);

  const initPromise = new Promise<string>((resolve, reject) => {
    window.addEventListener("message", function eventListener(event: MessageEvent) {
      if (event.data && event.data.type && (
        event.data.type === INITIALIZATION_SUCCESS || event.data.type === INITIALIZATION_FAILURE)) {

        window.removeEventListener("message", eventListener);
        if (event.data.type === INITIALIZATION_SUCCESS) {
          resolve(event.data.address);
        } else {
          reject(event.data.message);
        }
      }
    });
  });

  iFrame.contentWindow.postMessage(message, "*");
  return initPromise;
}


/**
 * Opens the channel.
 */
// TODO: Can this be part of funding instead of it's own method
export function openChannel(iFrameId: string, channel: Channel): void {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = openChannelRequest(channel);
  iFrame.contentWindow.postMessage(message, "*");

}
/**
 *  Validates signed data.
 * Promise resolves when the data is verified or an error occurs.
 */
export async function validateSignature(iFrameId: string, data, signature: string): Promise<boolean> {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = validationRequest(data, signature);

  const validatePromise = new Promise<boolean>((resolve, reject) => {
    window.addEventListener("message", function eventListener(event: MessageEvent) {
      if (event.data && event.data.type &&
        (event.data.type === VALIDATION_SUCCESS || event.data.type === VALIDATION_FAILURE)) {
        const receivedMessage = event.data as ValidationResponse;
        window.removeEventListener("message", eventListener);
        if (receivedMessage.type === VALIDATION_SUCCESS) {
          resolve(true);
        } else {
          const { error, reason } = receivedMessage;
          reject({ error, reason });
        }
      }
    });
  });

  iFrame.contentWindow.postMessage(message, "*");
  return validatePromise;
}

/**
 * Signs data with the wallet's private key. 
 * Promise resolves when a signature is received from the wallet or an error occurs.
 */
export async function signData(iFrameId: string, data): Promise<string> {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = signatureRequest(data);

  const signPromise = new Promise<string>((resolve, reject) => {
    window.addEventListener("message", function eventListener(event: MessageEvent) {
      if (event.data && event.data.type &&
        (event.data.type === SIGNATURE_SUCCESS || event.data.type === SIGNATURE_FAILURE)) {
        const receivedMessage = event.data as SignatureResponse;
        window.removeEventListener("message", eventListener);
        if (receivedMessage.type === SIGNATURE_SUCCESS) {
          const { signature } = receivedMessage;
          resolve(signature);
        } else {
          const { error, reason } = receivedMessage;
          reject({ error, reason });
        }
      }
    });
  });

  iFrame.contentWindow.postMessage(message, "*");
  return signPromise;
}

/**
 * Sends a message to the wallet.
 * This is used for communicating messages from the opponent's wallet to the current wallet.
 */
// TODO: Come up with a clearer name.
export function messageWallet(iFrameId: string, data, signature: string) {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = receiveMessage(data, signature);
  iFrame.contentWindow.postMessage(message, '*');
}

export function startConcludingGame(iFrameId: string): void {

  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = concludeChannelRequest();
  iFrame.contentWindow.postMessage(message, "*");
}

// TODO: Would it make sense to just accept an event handler as an argument instead of returning the event listener?
/**
 * Starts the funding process. 
 */
export function startFunding(iFrameId: string,
  channelId: string,
  myAddress: string,
  opponentAddress: string,
  myBalance: BN,
  opponentBalance: BN,
  playerIndex: number): void {

  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = fundingRequest(channelId, myAddress, opponentAddress, myBalance, opponentBalance, playerIndex);
  iFrame.contentWindow.postMessage(message, "*");
}

export function startChallenge(iFrameId: string) {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = createChallenge();
  iFrame.contentWindow.postMessage(message, "*");
}

export function respondToOngoingChallenge(iFrameId: string, responsePosition: string) {
  const iFrame = document.getElementById(iFrameId) as HTMLIFrameElement;
  const message = respondToChallenge(responsePosition);
  iFrame.contentWindow.postMessage(message, "*");
}