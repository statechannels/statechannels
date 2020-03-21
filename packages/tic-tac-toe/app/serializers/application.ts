import DS from 'ember-data';
import FirestoreSerializer from 'emberfire/serializers/firestore';
import {singularize} from 'ember-inflector';

export default class ApplicationSerializer extends FirestoreSerializer {
  // This is needed because of a bug in EmberFire v3.0.0-rc.6
  // Tracking PR: https://github.com/firebase/emberfire/pull/600
  normalizeCreateRecordResponse(
    _store: DS.Store,
    _primaryModelClass: DS.Model,
    payload: {doc: {id: string; parent: {id: string}}; data: object},
    id: string
  ): {data: {id: string; attributes: object; type: string}} {
    return {
      data: {
        id: id || payload.doc.id,
        attributes: payload.data,
        type: singularize(payload.doc.parent.id)
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
