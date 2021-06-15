import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import {parse} from 'pg-connection-string';

import {defaultDatabaseConfiguration} from './defaults';
import {WalletConfig, DatabaseConnectionConfiguration} from './types';

export function extractDBConfigFromWalletConfig(walletConfig: WalletConfig): Config {
  const connectionConfig = getDatabaseConnectionConfig(walletConfig);

  return {
    client: 'postgres',

    connection: {
      ...connectionConfig,
      user: connectionConfig.user || '',
    },
    ...knexSnakeCaseMappers(),
    pool: walletConfig.databaseConfiguration.pool || {},
  };
}
type DatabaseConnectionConfigObject = Required<Exclude<DatabaseConnectionConfiguration, string>>;

type PartialConfigObject = Partial<DatabaseConnectionConfigObject> &
  Required<Pick<DatabaseConnectionConfigObject, 'database'>>;
export function overwriteConfigWithDatabaseConnection(
  config: WalletConfig,
  databaseConnectionConfig: PartialConfigObject | string
): WalletConfig {
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
  config: WalletConfig
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
