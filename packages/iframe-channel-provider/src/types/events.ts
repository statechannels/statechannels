import EventEmitter from 'eventemitter3';
import {NotificationType, Notification} from '@statechannels/client-api-schema';

/**
 * Globally-unique-identifier header
 * @internal
 */
export interface EventType extends NotificationType {
  [id: string]: [unknown]; // guid
}
const eventEmitter = new EventEmitter<EventType>();
/**
 * @internal
 */
export type OnType = typeof eventEmitter.on;
/**
 * @internal
 */
export type OffType = typeof eventEmitter.off;
/**
 * @internal
 */
export type SubscribeType = (
  subscriptionType: Notification['method'],
  params?: any
) => Promise<string>;
/**
 * @internal
 */
export type UnsubscribeType = (subscriptionId: string) => Promise<boolean>;
