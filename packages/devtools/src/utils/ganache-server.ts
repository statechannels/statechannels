import {spawn} from "child_process";
import {ethers} from "ethers";
import {JsonRpcProvider} from "ethers/providers";
import {waitUntilFree, waitUntilUsed} from "tcp-port-used";
import kill from "tree-kill";

import {configureEnvVariables} from "../config/env";
configureEnvVariables();

interface Account {
  privateKey: string;
  amount?: string;
}
const ETHERLIME_ACCOUNTS: Account[] = [
  {privateKey: "0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8"},
  {privateKey: "0x2030b463177db2da82908ef90fa55ddfcef56e8183caf60db464bc398e736e6f"},
  {privateKey: "0x62ecd49c4ccb41a70ad46532aed63cf815de15864bc415c87d507afd6a5e8da2"},
  {privateKey: "0xf473040b1a83739a9c7cc1f5719fab0f5bf178f83314d98557c58aae1910e03a"},
  {privateKey: "0x823d590ed2cb5e8493bb0efc834771c1cde36f9fc49b9fe3620ebd0754ad6ea2"},
  {privateKey: "0xd6d710943471e4c37ceb787857e7a2b41ca57f9cb4307ee9a9b21436a8e709c3"},
  {privateKey: "0x187bb12e927c1652377405f81d93ce948a593f7d66cfba383ee761858b05921a"},
  {privateKey: "0xf41486fdb04505e7966c8720a353ed92ce0d6830f8a5e915fbde735106a06d25"},
  {privateKey: "0x6ca40ba4cca775643398385022264c0c414da1abd21d08d9e7136796a520a543"},
  {privateKey: "0xfac0bc9325ad342033afe956e83f0bf8f1e863c1c3e956bc75d66961fe4cd186"}
];

export class GanacheServer {
  provider: JsonRpcProvider;
  fundedPrivateKey: string;
  server: any;
  private port: number;
  private timeout: number;

  constructor(accounts: Account[] = ETHERLIME_ACCOUNTS, timeout = 5000) {
    if (!process.env.GANACHE_PORT) {
      throw new Error("No GANACHE_PORT found. Aborting!");
    }
    this.port = Number(process.env.GANACHE_PORT);
    this.timeout = timeout;

    if (!process.env.GANACHE_NETWORK_ID) {
      console.warn("No GANACHE_NETWORK_ID found.");
    }

    console.log(`Starting ganache on port ${this.port}`);

    this.fundedPrivateKey = accounts[0].privateKey;

    const oneMillion = ethers.utils.parseEther("1000000");

    const opts = [`--networkId ${process.env.GANACHE_NETWORK_ID}`, `--port ${this.port}`].concat(
      accounts.map(a => `--account ${a.privateKey},${a.amount || oneMillion}`)
    );
    const cmd = `ganache-cli ${opts.join(" ")}`;

    this.server = spawn("npx", ["-c", cmd], {stdio: "pipe"});
    this.server.stderr.on("data", data => {
      console.error(`Server threw error ${data}`);

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
}
