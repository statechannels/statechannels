import express, {Express} from 'express';
import _ from 'lodash';
import chalk from 'chalk';
import P from 'pino';
import got from 'got';
import ms from 'ms';

import {WalletConfig} from '../src/config';
import {ObjectiveDoneResult, UpdateChannelResult, Wallet} from '../src/wallet';
import {SocketIOMessageService} from '../src/message-service/socket-io-message-service';
import {createLogger} from '../src/logger';

import {
  CloseChannelStep,
  CreateChannelStep,
  CreateLedgerChannelStep,
  JobChannelLink,
  LoadNodeConfig,
  Peers,
  Step,
  UpdateChannelStep,
} from './types';

export class WalletLoadNode {
  private steps: Step[] = [];
  private jobToChannelMap: JobChannelLink[] = [];
  private completedSteps = 0;
  private server: Express;
  private proposedObjectives = new Set<string>();

  private constructor(
    private serverWallet: Wallet,
    private loadNodeConfig: LoadNodeConfig,
    private peers: Peers,
    private logger: P.Logger
  ) {
    // This will approve any new objectives proposed by other participants
    this.serverWallet.on('ObjectiveProposed', async o => {
      if (o.type === 'OpenChannel') {
        // This is an easy work around for https://github.com/statechannels/statechannels/issues/3668
        if (!this.proposedObjectives.has(o.objectiveId)) {
          this.logger.trace({objectiveId: o.objectiveId}, 'Auto approving objective');
          this.serverWallet.approveObjectives([o.objectiveId]);
          this.proposedObjectives.add(o.objectiveId);
        }
      }
    });

    this.server = express();
    this.server.use(express.json({limit: '50mb'}));

    // This endpoint is used to kick off processing
    // It will return once all the jobs (and peer's) jobs are done
    // Load data must be loaded prior to calling this
    this.server.get('/start', async (req, res) => {
      req.setTimeout(ms('1 day'));

      this.logger.trace('Starting job processing');
      console.log(chalk.whiteBright('Starting job processing..'));
      this.outputChannelStats();
      // If we didn't receive this from a peer it means it came from the user
      // We want to kick off processing in all nodes so we message our peers
      const fromPeer = req.query['fromPeer'];
      if (!fromPeer) {
        await Promise.all([this.runJobs(), this.sendGetRequestToPeers('/start?fromPeer=true')]);
      } else {
        await this.runJobs();
      }

      res.end();
    });

    // This endpoint is used to reset the job ids so the same load file can be used again
    // It doesn't erase channels just the association between a jobId and a channel
    // This lets the same load file be run multiple times
    this.server.get('/reset', async (req, res) => {
      this.steps = [];
      this.jobToChannelMap = [];

      const fromPeer = req.query['fromPeer'];
      if (!fromPeer) {
        await this.sendGetRequestToPeers('/reset?fromPeer=true');
      }

      this.logger.info('Jobs have been reset');

      res.end();
    });

    // This endpoint is used to receive a channel id that was created for a job id
    // One peer will create a channel for a job and then alert other peers using this endpoint
    this.server.post('/channelId', async (req, res) => {
      const {channelId, jobId}: JobChannelLink = req.body;

      this.jobToChannelMap.push({jobId, channelId});

      res.end();
    });

    // This endpoint loads the load file into the load node
    // It will not start processing the jobs unless the start query param is set to true
    this.server.post('/load', async (req, res) => {
      const requests: Step[] = req.body;

      const fromPeer = this.parseBooleanQueryParam('fromPeer', req);
      const startProcessing = this.parseBooleanQueryParam('start', req);

      await this.updateJobQueue(requests);

      // If we received this from a peer we don't want to send it right back to them
      if (!fromPeer) {
        await this.shareJobsWithPeers(requests);
      }

      if (startProcessing) {
        await Promise.all([this.sendGetRequestToPeers('/start?fromPeer=true'), this.runJobs()]);
      }

      res.end();
    });

    // Simple endpoint for checking if the server is ready
    this.server.get('/', (req, res) => res.end());
  }

  private outputChannelStats() {
    const ourSteps = this.steps.filter(s => s.serverId === this.loadNodeConfig.serverId);
    const createdAmount = ourSteps.filter(s => s.type === 'CreateChannel').length;
    const ledgerAmount = ourSteps.filter(s => s.type === 'CreateLedgerChannel').length;
    const isLedgerFunding = this.steps.some(s => s.type === 'CreateLedgerChannel');
    console.log(
      chalk.whiteBright(
        `This node will create ${createdAmount} channel(s) using ${
          isLedgerFunding ? 'ledger' : 'direct'
        } funding`
      )
    );
    if (ledgerAmount > 0) {
      console.log(chalk.whiteBright(`This node will create ${ledgerAmount} ledger channel(s)`));
    }

    const closedAmount = ourSteps.filter(s => s.type === 'CloseChannel').length;
    if (closedAmount > 0) {
      console.log(chalk.whiteBright(`This node will close ${closedAmount} channel(s)`));
    }
  }

  private parseBooleanQueryParam(paramName: string, req: express.Request): boolean {
    const param = req.query[paramName];
    return !!param && param.toString().toLocaleLowerCase() === 'true';
  }

  /**
   * Runs any jobs that have been loaded. Returns when all jobs for this server are complete.
   * @returns
   */
  private runJobs(): Promise<void> {
    const startTimestamp = Date.now();

    return new Promise<void>(resolve => {
      this.steps
        .filter(s => s.serverId === this.loadNodeConfig.serverId)
        .forEach(s =>
          setTimeout(async () => {
            this.logger.trace({step: s}, 'Starting job');

            const result = await this.handleStep(s);
            if (result.type !== 'Success') {
              this.logger.error({result, step: s}, 'Load step failed!');
              console.error(chalk.redBright(`Step failed for ${s.jobId}-${s.timestamp}`));
              process.exit(1);
            } else {
              // We use a simple counter to determine when we're done

              this.completedSteps++;
              this.logger.trace({step: s, timestamp: Date.now() - startTimestamp}, 'Completed job');

              const ourSteps = this.steps.filter(s => s.serverId === this.loadNodeConfig.serverId);
              // We only care if we've completed our steps
              if (this.completedSteps === ourSteps.length) {
                this.logger.trace(
                  {jobIds: this.jobToChannelMap.map(e => e.jobId)},
                  'All jobs completed!'
                );
                console.log(chalk.greenBright(`All jobs complete!`));
                resolve();
              }
            }
          }, s.timestamp)
        );
    });
  }

  private async shareChannelIdsWithPeers(jobAndChannel: {channelId: string; jobId: string}) {
    for (const {loadServerPort} of this.peers) {
      await got.post(`http://localhost:${loadServerPort}/channelId/`, {json: jobAndChannel});
    }
  }
  private async shareJobsWithPeers(steps: Step[]) {
    for (const {loadServerPort} of this.peers) {
      await got.post(`http://localhost:${loadServerPort}/load/?fromPeer=true`, {json: steps});
    }
  }
  private async sendGetRequestToPeers(urlPath: string) {
    for (const {loadServerPort} of this.peers) {
      await got.get(`http://localhost:${loadServerPort}${urlPath}`, {retry: 0});
    }
  }

  private async updateJobQueue(steps: Step[]): Promise<void> {
    this.steps = _.uniq(this.steps.concat(steps));
    console.log(chalk.yellow(`Updated job queue with ${steps.length} steps`));
    this.logger.info({steps}, 'Updated queue with steps');
  }

  private getChannelIdForJob(jobId: string): string {
    const entry = this.jobToChannelMap.find(e => e.jobId === jobId);
    if (!entry) {
      throw new Error(`No channel id for ${jobId}`);
    }
    return entry.channelId;
  }

  /**
   * These are the various handlers for different step types
   * TODO: Typing should not use any type for the request
   */
  private stepHandlers: Record<Step['type'], (step: any) => Promise<ObjectiveDoneResult>> = {
    CreateChannel: async (step: CreateChannelStep) => {
      const {fundingInfo} = step;
      if (fundingInfo.type === 'Direct') {
        const [result] = await this.serverWallet.createChannels([
          {...step.channelParams, fundingStrategy: 'Direct'},
        ]);

        const {jobId} = step;
        const {channelId} = result;

        this.jobToChannelMap.push({jobId, channelId});
        await this.shareChannelIdsWithPeers({jobId, channelId});

        return result.done;
      } else {
        const ledgerResult = this.jobToChannelMap.find(
          j => j.jobId === fundingInfo.fundingLedgerJob
        );

        if (!ledgerResult) {
          throw new Error(`Cannot find channel id for ledger job ${fundingInfo.fundingLedgerJob}`);
        }

        const {channelId: fundingLedgerChannelId} = ledgerResult;

        const [result] = await this.serverWallet.createChannels([
          {...step.channelParams, fundingStrategy: 'Ledger', fundingLedgerChannelId},
        ]);

        const {jobId} = step;
        const {channelId} = result;

        this.jobToChannelMap.push({jobId, channelId});
        await this.shareChannelIdsWithPeers({jobId, channelId});

        return result.done;
      }
    },
    CloseChannel: async (step: CloseChannelStep) => {
      const channelId = this.getChannelIdForJob(step.jobId);

      const [result] = await this.serverWallet.closeChannels([channelId]);

      return result.done;
    },
    UpdateChannel: async (step: UpdateChannelStep) => {
      const channelId = this.getChannelIdForJob(step.jobId);

      const {allocations, appData} = step.updateParams;
      const result = await this.serverWallet.updateChannel(channelId, allocations, appData);

      return result;
    },

    CreateLedgerChannel: async (step: CreateLedgerChannelStep) => {
      const result = await this.serverWallet.createLedgerChannel({
        ...step.ledgerChannelParams,
        fundingStrategy: 'Direct',
      });

      const {jobId} = step;
      const {channelId} = result;

      this.jobToChannelMap.push({jobId, channelId});
      await this.shareChannelIdsWithPeers({jobId, channelId});
      return result.done;
    },
  };

  /**
   * Handles an individual step from a load file.
   * @param step
   * @returns A promise that resolves to a result object. The result object may indicate success or an error.
   */
  private async handleStep(step: Step): Promise<ObjectiveDoneResult | UpdateChannelResult> {
    return this.stepHandlers[step.type](step);
  }

  public async destroy(): Promise<void> {
    this.server.removeAllListeners();
    await this.serverWallet.destroy();
  }

  public listen(): void {
    this.server.listen(this.loadNodeConfig.loadServerPort);
  }

  /**
   * This is used to register a peer with the wallet
   * @param port The message port for the peer.
   */
  public async registerMessagePeer(port: number): Promise<void> {
    this.serverWallet.messageService.registerPeer(`http://localhost:${port}`);
  }

  public static async create(
    walletConfig: WalletConfig,
    loadNodeConfig: LoadNodeConfig,
    peers: Peers
  ): Promise<WalletLoadNode> {
    // Create a message service factory that will use the port we specify
    const messageServiceFactory = await SocketIOMessageService.createFactory(
      'localhost',
      loadNodeConfig.messagePort
    );
    const serverWallet = await Wallet.create(walletConfig, messageServiceFactory);

    // We'll use the same log file as the wallet
    const logger = createLogger(walletConfig);

    return new WalletLoadNode(serverWallet, loadNodeConfig, peers, logger);
  }

  public get loadPort(): number {
    return this.loadNodeConfig.loadServerPort;
  }
}
