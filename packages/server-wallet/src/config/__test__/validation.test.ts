import {defaultTestWalletConfig} from '../defaults';
import {DatabaseConfiguration} from '../types';
import {validateEngineConfig} from '../validation';

describe('config validation', () => {
  describe('server wallet config', () => {
    it('validates the default test config', () => {
      expect(validateEngineConfig(defaultTestWalletConfig()).valid).toBe(true);
    });
  });

  describe('chain service config', () => {
    it('rejects an invalid private key', () => {
      const {valid, errors} = validateEngineConfig(
        defaultTestWalletConfig({
          chainServiceConfiguration: {
            pk: 'bla',
          },
        })
      );

      expect(valid).toBe(false);
      expect(errors[0].message).toMatch(
        `"chainServiceConfiguration.pk" with value "bla" fails to match the Hex value validator pattern`
      );
    });
    it('rejects an invalid rpc endpoint', () => {
      const chainServiceConfiguration = {provider: 'badurl'};
      const result = validateEngineConfig(defaultTestWalletConfig({chainServiceConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"chainServiceConfiguration.provider" must be a valid uri'
      );
      expect(result.valid).toBe(false);
    });
    it('rejects an invalid allowance mode', () => {
      const chainServiceConfiguration = {allowanceMode: 'bad'};
      const result = validateEngineConfig(
        // eslint-disable-next-line
        // @ts-ignore
        defaultTestWalletConfig({chainServiceConfiguration})
      );
      expect(result.errors[0].message).toMatch(
        '"chainServiceConfiguration.allowanceMode" must be one of [MaxUint, PerDeposit]'
      );
      expect(result.valid).toBe(false);
    });
    it('rejects an invalid polling interval', () => {
      const chainServiceConfiguration = {pollingInterval: 0};
      const result = validateEngineConfig(defaultTestWalletConfig({chainServiceConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"chainServiceConfiguration.pollingInterval" must be a positive number'
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('network config', () => {
    it('rejects an invalid chain id', () => {
      const networkConfiguration = {chainNetworkID: 0.5};
      const result = validateEngineConfig(defaultTestWalletConfig({networkConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"networkConfiguration.chainNetworkID" must be an integer'
      );
      expect(result.valid).toBe(false);
    });
  });
  describe('metrics config', () => {
    it('requires a metrics file when timingMetrics is enabled', () => {
      const metricsConfiguration = {
        timingMetrics: true,
      };
      const result = validateEngineConfig(defaultTestWalletConfig({metricsConfiguration}));
      expect(result.errors[0].message).toMatch(
        '"metricsConfiguration.metricsOutputFile" is required'
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
      const result = validateEngineConfig(defaultTestWalletConfig({databaseConfiguration}));
      expect(result.valid).toBe(true);
    });

    it('accepts a valid config with a connection object', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: {database: 'abc', host: 'abc', user: 'abc', port: 1234},
        pool: {max: 5},
        debug: false,
      };
      const result = validateEngineConfig(defaultTestWalletConfig({databaseConfiguration}));
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid connection string', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: 'INVALID',
        pool: {max: 5},
        debug: false,
      };
      const result = validateEngineConfig(defaultTestWalletConfig({databaseConfiguration}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toMatch('Invalid connection string');
    });

    it('rejects a invalid connection object', () => {
      const databaseConfiguration: DatabaseConfiguration = {
        connection: {dbName: 'abc', host: 'abc', user: 'abc', port: 1234} as any,
        pool: {max: 5},
        debug: false,
      };
      const result = validateEngineConfig(defaultTestWalletConfig({databaseConfiguration}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toMatch(
        '"databaseConfiguration.connection.dbName" is not allowed'
      );
    });
  });
});
