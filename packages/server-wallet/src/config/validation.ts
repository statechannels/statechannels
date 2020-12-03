import joi, {ValidationErrorItem} from 'joi';
import {parse} from 'pg-connection-string';

import {ServerWalletConfig} from './types';

const validateConnectionString = (connection: string) => {
  const parsed = parse(connection);
  const result = databaseObjectConfigurationSchema.validate(parsed);
  if (result.error) {
    throw new Error('Invalid connection string');
  }
  return parsed;
};
export const databaseObjectConfigurationSchema = joi.object({
  database: joi.string().required(),
  host: joi.string().required(),
  user: joi.string().required(),
  password: joi
    .string()
    .allow('')
    .optional(),
  port: joi
    .number()
    .integer()
    .optional(),
});
export const databaseConnectionConfigurationSchema = joi.alternatives().conditional('.', {
  is: joi.string(),
  then: joi.string().custom(validateConnectionString, 'The connection string is valid'),
  otherwise: databaseObjectConfigurationSchema,
});

export const databasePoolConfigurationSchema = joi.object({
  max: joi
    .number()
    .integer()
    .min(0)
    .optional(),
  min: joi
    .number()
    .integer()
    .min(0)
    .optional(),
});

export const databaseConfigurationSchema = joi.object({
  connection: databaseConnectionConfigurationSchema.required(),
  debug: joi.boolean().optional(),
  pool: databasePoolConfigurationSchema.optional(),
});

export const metricsConfigurationSchema = joi.object({
  timingMetrics: joi.boolean().required(),
  metricsOutputFile: joi.string().when('timingMetrics', {is: true, then: joi.string().required()}),
});

export const loggingConfigurationSchema = joi.object({
  logLevel: joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace'),
  logDestination: joi.string().required(),
});

export const networkConfigurationSchema = joi.object({
  rpcEndpoint: joi
    .string()
    .uri()
    .optional(),
  chainNetworkID: joi
    .number()
    .integer()
    .min(0)

    .required(),
});

export const serverWalletConfigSchema = joi.object({
  databaseConfiguration: databaseConfigurationSchema,
  networkConfiguration: networkConfigurationSchema,
  ethereumPrivateKey: joi
    .string()
    .pattern(/0[xX][0-9a-fA-F]{40}/, {name: 'Hex value validator'})
    .required(),

  workerThreadAmount: joi
    .number()
    .min(0)
    .optional(),
  skipEvmValidation: joi.boolean().optional(),
  loggingConfiguration: loggingConfigurationSchema.optional(),
  metricsConfiguration: metricsConfigurationSchema.optional(),
});

export function validateServerWalletConfig(
  config: Record<string, any>
): {valid: boolean; value: ServerWalletConfig | undefined; errors: ValidationErrorItem[]} {
  const results = serverWalletConfigSchema.validate(config);
  return {
    valid: !results.error,
    value: results.value ? (results.value as ServerWalletConfig) : undefined,
    errors: results.error?.details || [],
  };
}
