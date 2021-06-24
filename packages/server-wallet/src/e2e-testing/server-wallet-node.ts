import {CreateChannelParams} from '@statechannels/client-api-schema';
import express, {Express} from 'express';

import {WalletConfig} from '../config';
import {Wallet} from '../wallet';
import {SocketIOMessageService} from '../message-service/socket-io-message-service';

type CreateChannelRequest = {
  type: 'CreateChannel';
  jobId: string;
  channelParams: CreateChannelParams;
};

type CloseChannelRequest = {
  type: 'CloseChannel';
  jobId: string;
};
export type ServerOperationRequest = CreateChannelRequest | CloseChannelRequest;
export class ServerWalletNode {
  private jobChannelMap = new Map<string, string>();
  private async handleWalletRequest(request: ServerOperationRequest): Promise<void> {
    const handlers: Record<ServerOperationRequest['type'], any> = {
      CreateChannel: async (request: CreateChannelRequest) => {
        const [result] = await this.serverWallet.createChannels([request.channelParams]);
        console.log(JSON.stringify(result));
        this.jobChannelMap.set(request.jobId, result.channelId);
      },
      CloseChannel: async (request: CloseChannelRequest) => {
        const channelId = this.jobChannelMap.get(request.jobId);
        if (!channelId) throw new Error('No channel id found');
        const [result] = await this.serverWallet.closeChannels([channelId]);

        this.jobChannelMap.set(request.jobId, result.channelId);
      },
    };

    await handlers[request.type](request);
  }

  public async destroy(): Promise<void> {
    this.server.removeAllListeners();
    await this.serverWallet.destroy();
  }
  private server: Express;
  private constructor(private serverWallet: Wallet, private port: number) {
    this.serverWallet.on('ObjectiveProposed', console.log);
    this.serverWallet.on('ObjectiveProposed', async o => {
      await this.serverWallet.approveObjectives([o.objectiveId]);
      console.log(`Auto approving ${o.objectiveId}`);
    });
    this.server = express();
    this.server.use(express.json());
    this.server.post('/', async (req, res) => {
      const requests: ServerOperationRequest[] = req.body;
      for (const serverRequest of requests) {
        await this.handleWalletRequest(serverRequest);
      }
      res.end();
    });
  }

  public listen(): void {
    this.server.listen(this.port);
  }

  public async registerPeer(port: number): Promise<void> {
    (this.serverWallet.messageService as SocketIOMessageService).registerPeer('localhost', port);
  }
  public static async create(
    walletConfig: WalletConfig,
    messageServicePort: number,
    nodePort: number
  ): Promise<ServerWalletNode> {
    const messageServiceFactory = await SocketIOMessageService.createFactory(
      'localhost',
      messageServicePort
    );
    const serverWallet = await Wallet.create(walletConfig, messageServiceFactory);
    return new ServerWalletNode(serverWallet, nodePort);
  }
}
