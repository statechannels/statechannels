import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import {parse} from 'pg-connection-string';

import {defaultDatabaseConfiguration} from './defaults';
import {EngineConfig, DatabaseConnectionConfiguration} from './types';

export function extractDBConfigFromEngineConfig(engineConfig: EngineConfig): Config {
  const connectionConfig = getDatabaseConnectionConfig(engineConfig);

  return {
    client: 'postgres',

    connection: {
      ...connectionConfig,
      user: connectionConfig.user || '',
    },
    ...knexSnakeCaseMappers(),
    pool: engineConfig.databaseConfiguration.pool || {},
  };
}
type DatabaseConnectionConfigObject = Required<Exclude<DatabaseConnectionConfiguration, string>>;

type PartialConfigObject = Partial<DatabaseConnectionConfigObject> &
  Required<Pick<DatabaseConnectionConfigObject, 'database'>>;
export function overwriteConfigWithDatabaseConnection(
  config: EngineConfig,
  databaseConnectionConfig: PartialConfigObject | string
): EngineConfig {
  return {
    ...config,
    databaseConfiguration: {
      ...config.databaseConfiguration,
      connection: isPartialDatabaseConfigObject(databaseConnectionConfig)
        ? {
            host: databaseConnectionConfig.host || defaultDatabaseConfiguration.connection.host,
            port: databaseConnectionConfig.port || defaultDatabaseConfiguration.connection.port,
            database: databaseConnectionConfig.database,
            user: databaseConnectionConfig.user || defaultDatabaseConfiguration.connection.user,
            password: databaseConnectionConfig.password || '',
          }
        : (databaseConnectionConfig as string),
    },
  };
}

function isPartialDatabaseConfigObject(
  connectionConfig: PartialConfigObject | string
): connectionConfig is PartialConfigObject {
  return typeof connectionConfig !== 'string';
}

export function getDatabaseConnectionConfig(
  config: EngineConfig
): DatabaseConnectionConfigObject & {host: string; port: number} {
  if (typeof config.databaseConfiguration.connection === 'string') {
    const {connection: defaultConnection} = defaultDatabaseConfiguration;
    const {port, host, user, database, password} = parse(config.databaseConfiguration.connection);
    return {
      port: port ? parseInt(port) : defaultConnection.port,
      host: host || defaultConnection.host,
      database: database || '',
      user: user || defaultConnection.user,
      password: password || '',
    };
  } else {
    // TODO: Sort out the typing
    return config.databaseConfiguration.connection as DatabaseConnectionConfigObject;
  }
}
