import FirestoreAdapter from 'emberfire/adapters/firestore';

export default class ApplicationAdapter extends FirestoreAdapter {
  // Uncomment the following lines to enable offline persistence and multi-tab support
  // enablePersistence: true,
  // persistenceSettings: { synchronizeTabs: true }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your adapters.
declare module 'ember-data/types/registries/adapter' {
  export default interface AdapterRegistry {
    application: ApplicationAdapter;
  }
}
