import {defaultTestConfig} from '../defaults';
import {DatabaseConfiguration} from '../types';
import {validateServerWalletConfig} from '../validation';

describe('config validation', () => {
  describe('server wallet config', () => {
    it('validates the default test config', () => {
      expect(validateServerWalletConfig(defaultTestConfig()).valid).toBe(true);
    });

    it('rejects an invalid private key', () => {
      const {valid, errors} = validateServerWalletConfig(
        defaultTestConfig({ethereumPrivateKey: 'bla'})
      );

      expect(valid).toBe(false);
      expect(errors[0].message).toMatch(
        `"ethereumPrivateKey" with value "bla" fails to match the Hex value validator pattern`
      );
    });
  });

  describe('network config', () => {
    it('rejects an invalid rpc endpoint', () => {
      const networkConfiguration = {rpcEndpoint: 'badurl'};
      const result = validateServerWalletConfig(defaultTestConfig({networkConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"networkConfiguration.rpcEndpoint" must be a valid uri'
      );
      expect(result.valid).toBe(false);
    });
    it('rejects an invalid chain id', () => {
      const networkConfiguration = {chainNetworkID: 0.5};
      const result = validateServerWalletConfig(defaultTestConfig({networkConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"networkConfiguration.chainNetworkID" must be an integer'
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('database config', () => {
    it('accepts a valid config', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: 'postgresql://user:pass@localhost:5432/dbname',
        pool: {max: 5},
        debug: false,
      };
      const result = validateServerWalletConfig(defaultTestConfig({databaseConfiguration}));
      expect(result.valid).toBe(true);
    });

    it('accepts a valid config with a connection object', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: {database: 'abc', host: 'abc', user: 'abc', port: 1234},
        pool: {max: 5},
        debug: false,
      };
      const result = validateServerWalletConfig(defaultTestConfig({databaseConfiguration}));
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid connection string', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: 'INVALID',
        pool: {max: 5},
        debug: false,
      };
      const result = validateServerWalletConfig(defaultTestConfig({databaseConfiguration}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toMatch('Invalid connection string');
    });

    it('rejects a invalid connection object', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: {dbName: 'abc', host: 'abc', user: 'abc', port: 1234} as any,
        pool: {max: 5},
        debug: false,
      };
      const result = validateServerWalletConfig(defaultTestConfig({databaseConfiguration}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toMatch(
        '"databaseConfiguration.connection.dbName" is not allowed'
      );
    });
  });
});
