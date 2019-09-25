import { EventEmitter2 } from 'eventemitter2';
import { WalletEventType, WalletEvent } from './wallet-events';

/**
 * A wallet event listener that can be used to listen to the various [[WalletEvent]] that occur in the wallet.
 */
export class WalletEventListener {
  private eventEmitter: EventEmitter2;

  constructor() {
    this.eventEmitter = new EventEmitter2();
    window.addEventListener('message', (event: MessageEvent) => {
      // TODO: Check where the message came from
      if (event.data && event.data.type && event.data.type.startsWith('WALLET.')) {
        this.eventEmitter.emit(event.data.type, event.data);
      }
    });
  }

  /**
   * Subscribe an event handler to listen for when a specific [[WalletEvent]].
   * @param eventType The [[WalletEventType]] of the event to listen for.
   * @param eventHandler The event handler to subscribe to the event.
   */
  public subscribe(eventType: WalletEventType, eventHandler: (event: WalletEvent) => void) {
    this.eventEmitter.on(eventType, eventHandler);
  }

  /**
   * Removes all event listeners that were subscribed to listen for [[WalletEvent]].
   * @param eventType The [[WalletEventType]] of the event to unsubscribe from.
   */
  public unSubscribe(eventType: WalletEventType): void {
    this.eventEmitter.removeAllListeners(eventType);
  }

  /**
   * Removes all subscribed event handlers.
   */
  public unSubscribeAll() {
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Subscribes an event handler for all [[WalletEvent]] that may be emitted.
   * @param eventHandler The event handler to subscribe.
   */
  public subscribeAll(eventHandler: (event: WalletEvent) => void) {
    this.eventEmitter.onAny((eventType, event) => eventHandler(event));
  }
}
