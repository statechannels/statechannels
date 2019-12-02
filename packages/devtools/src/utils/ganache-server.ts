import {spawn} from 'child_process';
import {ethers} from 'ethers';
import {JsonRpcProvider} from 'ethers/providers';
import log from 'loglevel';
import {waitUntilFree, waitUntilUsed} from 'tcp-port-used';
import kill from 'tree-kill';

import {ETHERLIME_ACCOUNTS} from '../constants';
import {Account} from '../types';

log.setDefaultLevel(log.levels.INFO);

export class GanacheServer {
  provider: JsonRpcProvider;
  fundedPrivateKey: string;
  server: any;

  constructor(
    public readonly port: number = 8545,
    public readonly chainId: number = 9001,
    accounts: Account[] = ETHERLIME_ACCOUNTS,
    public readonly timeout: number = 5000,
    gasLimit = 1000000000,
    gasPrice = '0x01'
  ) {
    log.info(`Starting ganache on port ${this.port} with network ID ${this.chainId}`);

    this.fundedPrivateKey = accounts[0].privateKey;

    const oneMillion = ethers.utils.parseEther('1000000');

    const concat = (a, b) => a.concat(b);
    const opts = [
      [`--networkId ${this.chainId}`, `--port ${this.port}`],
      accounts.map(a => `--account ${a.privateKey},${a.amount || oneMillion}`),
      [`--gasLimit ${gasLimit}`, `--gasPrice ${gasPrice}`]
    ]
      .reduce(concat)
      .join(' ');

    const cmd = `ganache-cli ${opts}`;

    this.server = spawn('npx', ['-c', cmd], {stdio: 'pipe'});
    this.server.stderr.on('data', data => {
      log.error(`Server threw error ${data}`);
      throw new Error('Ganache server failed to start');
    });
    this.provider = new JsonRpcProvider(`http://localhost:${this.port}`);
  }

  static async connect(port: number): Promise<GanacheServer> {
    const provider = new JsonRpcProvider(`http://localhost:${port}`);
    try {
      await provider.getBlockNumber();
      return new GanacheServer(port);
    } catch (e) {
      return Promise.reject(`No ganache server to connect to locally on port ${port}`);
    }
  }

  async ready() {
    await waitUntilUsed(this.port, 500, this.timeout);
  }

  async close() {
    kill(this.server.pid);
    await waitUntilFree(this.port, 500, this.timeout);
  }

  onClose(listener: () => void) {
    this.server.on('close', listener);
  }
  // TODO: Obsolete?
  // async deployContracts(deployments: (Deployment | any)[]): Promise<DeployedArtifacts> {
  //   const deployer = new EtherlimeGanacheDeployer(undefined, Number(process.env.GANACHE_PORT));

  //   const deployedArtifacts: DeployedArtifacts = {};
  //   for (const deployment of deployments) {
  //     const artifact = deployment.artifact || deployment;

  //     let args: string[] = [];
  //     if (deployment.arguments) {
  //       args = deployment.arguments(deployedArtifacts);
  //     }

  //     const deployedArtifact = await deployer.deploy(artifact, undefined, ...args);

  //     deployedArtifacts[artifact.contractName] = {
  //       address: deployedArtifact.contractAddress,
  //       abi: JSON.stringify(artifact.abi)
  //     };
  //   }
  //   log.info(`Contracts deployed to chain`);
  //   return deployedArtifacts;
  // }
}
