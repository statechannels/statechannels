import {spawn} from "child_process";
import {ethers} from "ethers";
import {JsonRpcProvider} from "ethers/providers";
import log from "loglevel";
import {waitUntilFree, waitUntilUsed} from "tcp-port-used";
import kill from "tree-kill";

import {ETHERLIME_ACCOUNTS} from "src/constants";
import {Account} from "src/types";
import {configureEnvVariables} from "../config/env";
configureEnvVariables();

export class GanacheServer {
  provider: JsonRpcProvider;
  fundedPrivateKey: string;
  server: any;

  constructor(
    public readonly port: number,
    accounts: Account[] = ETHERLIME_ACCOUNTS,
    public readonly timeout: number = 5000,
    gasLimit: number = 1000000000,
    gasPrice: string = "0x01"
  ) {
    if (!port) {
      throw new Error("No port was specified. Aborting!");
    }

    this.port = port;
    this.timeout = timeout;

    if (!process.env.GANACHE_NETWORK_ID) {
      log.warn("No GANACHE_NETWORK_ID found.");
    }

    log.info(`Starting ganache on port ${this.port}`);

    this.fundedPrivateKey = accounts[0].privateKey;

    const oneMillion = ethers.utils.parseEther("1000000");

    const opts = [`--networkId ${process.env.GANACHE_NETWORK_ID}`, `--port ${this.port}`]
      .concat(
        accounts.map(account => `--account ${account.privateKey},${account.amount || oneMillion}`)
      )
      .concat([`--gasLimit ${gasLimit}`, `--gasPrice ${gasPrice}`]);

    const cmd = `ganache-cli ${opts.join(" ")}`;

    this.server = spawn("npx", ["-c", cmd], {stdio: "pipe"});
    this.server.stderr.on("data", data => {
      log.error(`Server threw error ${data}`);
      throw new Error("Ganache server failed to start");
    });
    this.provider = new JsonRpcProvider(`http://localhost:${this.port}`);
  }

  async ready() {
    await waitUntilUsed(this.port, 500, this.timeout);
  }

  async close() {
    kill(this.server.pid);

    try {
      await waitUntilFree(this.port, 500, this.timeout);
    } catch (err) {
      throw err;
    }
  }

  async deployContracts(artifacts: any[]) {
    log.info("Deploying artifacts");
  }
}
