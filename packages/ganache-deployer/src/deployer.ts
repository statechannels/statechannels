import fs from 'fs';
import path from 'path';
import {CompiledContract, EtherlimeGanacheDeployer} from 'etherlime-lib';
import {logger} from 'etherlime-logger';
import {colors} from 'etherlime-utils';
import writeJsonFile from 'write-json-file';

const GANACHE_CONTRACTS_FILE = 'ganache-network-context.json';
const GANACHE_CONTRACTS_PATH = path.join(__dirname, '../', GANACHE_CONTRACTS_FILE);

interface CacheKey {
  name: string;
  libraries: Record<string, string>; // name -> address
  args: any[];
  bytecode: string;
}

interface Deployment {
  name: string;
  address: string;
  libraries: Record<string, string>; // name -> address
  args: any[];
  bytecode: string;
}

interface DeploymentsFile {
  deploymentsFileVersion: '0.1';
  deployments: Deployment[];
}

export const loadDeployments = (): Deployment[] | undefined => {
  if (fs.existsSync(GANACHE_CONTRACTS_PATH)) {
    const raw = fs.readFileSync(GANACHE_CONTRACTS_PATH);
    const parsed = JSON.parse(raw.toString());
    if ('deploymentsFileVersion' in parsed && parsed.deploymentsFileVersion === '0.1') {
      return (parsed as DeploymentsFile).deployments;
    }
  }
  return undefined;
};

const findDeployment = (deployments: Deployment[], key: CacheKey): Deployment | undefined => {
  const {name, libraries, args, bytecode} = key;

  return deployments.find(deployment => {
    // easy checks first
    if (deployment.name !== name || deployment.bytecode !== bytecode) {
      return false;
    }
    // check args
    if (deployment.args.length !== args.length) {
      return false;
    }
    for (let i = 0; i < args.length; i++) {
      if (deployment.args[i] !== args[i]) {
        return false;
      }
    }
    // check existing libraries are a subset of those passed in
    let librariesMatch = true;
    for (const libraryName of Object.keys(deployment.libraries)) {
      librariesMatch =
        librariesMatch && libraries[libraryName] === deployment.libraries[libraryName];
    }
    return librariesMatch;
  });
};

const addressFromCache = (key: CacheKey): string | undefined => {
  const deployments = loadDeployments();
  if (!deployments) {
    return undefined;
  }
  const existingDeployment = findDeployment(deployments, key);
  return existingDeployment && existingDeployment.address;
};

class KeyExistsError extends Error {
  public address: string;
  constructor(key: CacheKey, address: string) {
    super(`Key already exists for contract ${key.name}!`);
    this.address = address;
  }
}

const addToCache = (key: CacheKey, address: string) => {
  const deployments = loadDeployments();

  if (deployments) {
    // check it hasn't been added in the meantime
    const existingDeployment = findDeployment(deployments, key);
    if (existingDeployment) {
      throw new KeyExistsError(key, existingDeployment.address);
    }
  }
  const newDeployment: Deployment = {...key, address};
  const newDeployments = deployments || [];
  newDeployments.push(newDeployment);
  // we could still, technically, be overwriting a file that has been changed in the meantime
  // but that's probably unlikely enough that we won't worry about it
  const fileData: DeploymentsFile = {deploymentsFileVersion: '0.1', deployments: newDeployments};

  writeJsonFile(GANACHE_CONTRACTS_PATH, fileData);
};

export class GanacheNCacheDeployer {
  etherlimeDeployer: EtherlimeGanacheDeployer;

  constructor(port: number) {
    this.etherlimeDeployer = new EtherlimeGanacheDeployer(undefined, port);
  }

  public async deploy(
    contract: CompiledContract,
    libraries: Record<string, string> = {},
    ...args
  ): Promise<string> {
    const {contractName: name, bytecode} = contract;
    const cacheKey = {name, libraries, bytecode, args};

    const existingAddress = addressFromCache(cacheKey);
    if (existingAddress) {
      logger.log(
        `Contract ${colors.colorName(name)} already exists address: ${colors.colorAddress(
          existingAddress
        )}`
      );
      return existingAddress;
    }

    const deployedContract = await this.etherlimeDeployer.deploy(contract, libraries, ...args);

    try {
      addToCache(cacheKey, deployedContract.contractAddress);
      return deployedContract.contractAddress;
    } catch (e) {
      if (e instanceof KeyExistsError) {
        const conflictAddress = e.address;
        logger.log(
          `Contract ${colors.colorName(name)} already exists at address: ${colors.colorAddress(
            conflictAddress
          )}. We also deployed it at ${colors.colorAddress(
            deployedContract.contractAddress
          )}, due to a race condition.`
        );
        return conflictAddress;
      } else {
        throw e;
      }
    }
  }
}
