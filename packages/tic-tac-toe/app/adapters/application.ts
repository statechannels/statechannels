import RealtimeDatabaseAdapter from 'emberfire/adapters/realtime-database';

export default class ApplicationAdapter extends RealtimeDatabaseAdapter {
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
