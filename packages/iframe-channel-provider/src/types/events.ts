import EventEmitter from 'eventemitter3';
import {NotificationType, Notification} from '@statechannels/client-api-schema';

export interface EventType extends NotificationType {
  [id: string]: [unknown]; // guid
}
const eventEmitter = new EventEmitter<EventType>();
export type OnType = typeof eventEmitter.on;
export type OffType = typeof eventEmitter.off;
export type SubscribeType = (
  subscriptionType: Notification['method'],
  params?: any
) => Promise<string>;
export type UnsubscribeType = (subscriptionId: string) => Promise<boolean>;
