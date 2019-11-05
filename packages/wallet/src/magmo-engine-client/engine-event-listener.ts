import {EventEmitter2} from "eventemitter2";
import {EngineEventType, EngineEvent} from "./engine-events";

/**
 * A engine event listener that can be used to listen to the various [[EngineEvent]] that occur in the engine.
 */
export class EngineEventListener {
  private eventEmitter: EventEmitter2;

  constructor() {
    this.eventEmitter = new EventEmitter2();
    window.addEventListener("message", (event: MessageEvent) => {
      // TODO: Check where the message came from
      if (event.data && event.data.type && event.data.type.startsWith("ENGINE.")) {
        this.eventEmitter.emit(event.data.type, event.data);
      }
    });
  }

  /**
   * Subscribe an event handler to listen for when a specific [[EngineEvent]].
   * @param eventType The [[EngineEventType]] of the event to listen for.
   * @param eventHandler The event handler to subscribe to the event.
   */
  public subscribe(eventType: EngineEventType, eventHandler: (event: EngineEvent) => void) {
    this.eventEmitter.on(eventType, eventHandler);
  }

  /**
   * Removes all event listeners that were subscribed to listen for [[EngineEvent]].
   * @param eventType The [[EngineEventType]] of the event to unsubscribe from.
   */
  public unSubscribe(eventType: EngineEventType): void {
    this.eventEmitter.removeAllListeners(eventType);
  }

  /**
   * Removes all subscribed event handlers.
   */
  public unSubscribeAll() {
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Subscribes an event handler for all [[EngineEvent]] that may be emitted.
   * @param eventHandler The event handler to subscribe.
   */
  public subscribeAll(eventHandler: (event: EngineEvent) => void) {
    this.eventEmitter.onAny((eventType, event) => eventHandler(event));
  }
}
