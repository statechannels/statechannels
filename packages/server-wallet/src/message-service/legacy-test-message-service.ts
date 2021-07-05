import {Message} from '@statechannels/client-api-schema';
import {Logger} from 'pino';

import {Engine} from '..';

import {MessageServiceInterface} from './types';

/**
 * This is used for older tests that don't use the wallet yet.
 * It handles pushing messages into engines automatically
 * This should be phased out eventually.
 */
export class LegacyTestMessageHandler implements MessageServiceInterface {
  private _destroyed = false;
  public constructor(
    private _engines: {participantId: string; engine: Engine}[],
    private _logger?: Logger
  ) {
    const hasUniqueParticipants =
      new Set(this._engines.map(w => w.participantId)).size === this._engines.length;
    const hasUniqueEngines =
      new Set(this._engines.map(w => w.engine)).size === this._engines.length;

    if (!hasUniqueParticipants) {
      throw new Error('Duplicate participant ids');
    }

    if (!hasUniqueEngines) {
      throw new Error('Duplicate engines');
    }
  }

  public async registerPeer(_peerUrl: string): Promise<void> {
    throw new Error('Not supported');
  }

  public async destroy(): Promise<void> {
    this._destroyed = true;
  }
  public async send(messages: Message[]): Promise<void> {
    if (this._destroyed) {
      this._logger?.warn('Message service already destroyed');
      return;
    }
    for (const message of messages) {
      const matching = this._engines.find(w => w.participantId === message.recipient);

      if (!matching) {
        throw new Error(`Invalid recipient ${message.recipient}`);
      }

      const result = await matching.engine.pushMessage(message.data);

      await this.send(result.outbox.map(o => o.params));
    }
  }
}
