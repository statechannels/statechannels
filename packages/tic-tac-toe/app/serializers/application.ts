import DS from 'ember-data';
import RealtimeDatabaseSerializer from 'emberfire/serializers/realtime-database';
import {singularize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import FirebaseAppService from 'emberfire/services/firebase-app';

export default class ApplicationSerializer extends RealtimeDatabaseSerializer {
  @service firebaseApp!: FirebaseAppService;

  // This is needed because of a bug in EmberFire v3.0.0-rc.6
  // Tracking PR: https://github.com/firebase/emberfire/pull/600
  normalizeCreateRecordResponse(
    _store: DS.Store,
    _primaryModelClass: DS.Model,
    payload: {ref: firebase.database.Reference; data: object},
    id: string
  ): {data: {id: string; attributes: object; type: string}} {
    if (!payload.ref || !payload.ref.key || !payload.ref.parent || !payload.ref.parent.key) {
      throw new Error('Payload ref values are null or undefined');
    }
    // Delete this record onDisconnect
    payload.ref.onDisconnect().remove();
    return {
      data: {
        id: id || payload.ref.key,
        attributes: payload.data,
        type: singularize(payload.ref.parent.key)
      }
    };
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your serializers.
declare module 'ember-data/types/registries/serializer' {
  export default interface SerializerRegistry {
    application: ApplicationSerializer;
  }
}
