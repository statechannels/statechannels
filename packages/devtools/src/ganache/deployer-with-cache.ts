import * as fs from 'fs';
import * as path from 'path';

import {CompiledContract} from 'etherlime-lib';
import {colors} from 'etherlime-utils';
import writeJsonFile from 'write-json-file';
import lockfile from 'lockfile';

import {GanacheDeployer} from './deployer';
import {logger} from './logger';

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

class KeyExistsError extends Error {
  public address: string;
  constructor(key: CacheKey, address: string) {
    super(`Key already exists for contract ${key.name}!`);
    this.address = address;
  }
}

export class GanacheNCacheDeployer {
  deployer: GanacheDeployer;

  constructor(
    public readonly port: number,
    public readonly deploymentsPath: string,
    privateKey?: string
  ) {
    this.deployer = new GanacheDeployer(port, privateKey);
  }

  get etherlimeDeployer() {
    return this.deployer.etherlimeDeployer;
  }

  public async deploy(
    contract: CompiledContract,
    libraries: Record<string, string> = {},
    ...args: any[]
  ): Promise<string> {
    const {contractName: name, bytecode} = contract;
    const lockPath = `${path.join(
      process.cwd(),
      process.env.GANACHE_CACHE_FOLDER || '',
      name
    )}.lock`;

    await new Promise((resolve, reject) =>
      lockfile.lock(lockPath, {wait: 300_000 /* 5 minutes */}, result => {
        !result ? resolve() : reject(result);
      })
    );

    const cacheKey = {name, libraries, bytecode, args};

    const existingAddress = this.addressFromCache(cacheKey);
    if (existingAddress) {
      logger.info(
        `Contract ${colors.colorName(name)} already exists address: ${colors.colorAddress(
          existingAddress
        )}`
      );
      return existingAddress;
    }

    const contractAddress = await this.deployer.deploy(contract, libraries, ...args);

    try {
      await this.addToCache(cacheKey, contractAddress);

      return contractAddress;
    } catch (e) {
      if (e instanceof KeyExistsError) {
        const conflictAddress = e.address;
        logger.warn(
          `Contract ${colors.colorName(name)} already exists at address: ${colors.colorAddress(
            conflictAddress
          )}. We also deployed it at ${colors.colorAddress(
            contractAddress
          )}, due to a race condition.`
        );
        return conflictAddress;
      } else {
        throw e;
      }
    } finally {
      await new Promise((resolve, reject) =>
        lockfile.unlock(lockPath, result => {
          result ? reject(result) : resolve();
        })
      );
    }
  }

  private async addToCache(key: CacheKey, address: string) {
    const deployments = this.loadDeployments();

    if (deployments) {
      // check it hasn't been added in the meantime
      const existingDeployment = this.findDeployment(deployments, key);
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

    await writeJsonFile(this.deploymentsPath, fileData);
  }

  private findDeployment(deployments: Deployment[], key: CacheKey): Deployment | undefined {
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
  }

  private addressFromCache(key: CacheKey): string | undefined {
    const deployments = this.loadDeployments();
    if (!deployments) {
      return undefined;
    }
    const existingDeployment = this.findDeployment(deployments, key);
    return existingDeployment && existingDeployment.address;
  }

  private loadDeployments(): Deployment[] | undefined {
    if (fs.existsSync(this.deploymentsPath)) {
      const raw = fs.readFileSync(this.deploymentsPath);
      const parsed = JSON.parse(raw.toString());
      if ('deploymentsFileVersion' in parsed && parsed.deploymentsFileVersion === '0.1') {
        return (parsed as DeploymentsFile).deployments;
      }
    }
    return undefined;
  }
}
