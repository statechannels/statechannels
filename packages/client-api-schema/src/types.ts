/**
 * Ethereum Address
 * @pattern  ^0x([a-fA-F0-9]{40})|0$
 */
export type Address = string;

/**
 * Nitro ChannelId
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type ChannelId = string;

/**
 * Nitro ChannelId
 * @pattern  ^0x(0{24})([a-fA-F0-9]{40})$
 */
export type ExternalDestination = string; // currently unused in this schema

/**
 * Bytes32
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type Bytes32 = string;

/**
 * Uint256
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type Uint256 = string;

interface JsonRpcRequest<MethodName, RequestParams> {
  id: string; // in the json-rpc spec this is optional, but we require it for all our requests
  jsonrpc: '2.0';
  method: MethodName;
  params: RequestParams;
}
interface JsonRpcResponse<ResultType> {
  id: number;
  jsonrpc: '2.0';
  result: ResultType;
}

interface JsonRpcNotification<NotificationName, NotificationParams> {
  jsonrpc: '2.0';
  method: NotificationName;
  params: NotificationParams;
}

interface JsonRpcError<Code, Message, Data = undefined> {
  id: number;
  jsonrpc: '2.0';
  error: Data extends undefined
    ? {code: Code; message: Message}
    : {code: Code; message: Message; data: Data};
}

export type ChannelStatus =
  | 'proposed'
  | 'opening'
  | 'funding'
  | 'running'
  | 'challenging'
  | 'responding'
  | 'closing'
  | 'closed';

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: Address; // Address used to sign channel updates
  destination: Address; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: Address; // Address of EOA to receive channel proceeds.
  amount: Uint256; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  token: Address; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

export type Allocations = Allocation[]; // included for backwards compatibility

export interface Message {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: unknown; // Message payload. Format defined by wallet and opaque to app.
}

export interface Funds {
  token: Address;
  amount: Uint256;
}

export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: Address;
  channelId: ChannelId;
  status: ChannelStatus;
  turnNum: Uint256;
  challengeExpirationTime?: number;
}

// GetWalletInformation
export type GetWalletInformationRequest = JsonRpcRequest<'GetWalletInformation', {}>;
export type GetWalletInformationResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address | null;
  walletVersion: string;
}>;

// EnableEthereum
export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address;
  walletVersion: string;
}>;
export type EnableEthereumError = JsonRpcError<100, 'Ethereum Not Enabled'>;

// CreateChannel
export type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual';
export interface CreateChannelParams {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: Address;
  appData: string;
  fundingStrategy: FundingStrategy;
}
export type CreateChannelRequest = JsonRpcRequest<'CreateChannel', CreateChannelParams>;
export type CreateChannelResponse = JsonRpcResponse<ChannelResult>;

// JoinChannel
export interface JoinChannelParams {
  channelId: ChannelId;
}
export type JoinChannelRequest = JsonRpcRequest<'JoinChannel', JoinChannelParams>;
export type JoinChannelResponse = JsonRpcResponse<ChannelResult>;

// UpdateChannel
export interface UpdateChannelParams {
  channelId: ChannelId;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}
export type UpdateChannelRequest = JsonRpcRequest<'UpdateChannel', UpdateChannelParams>;
export type UpdateChannelResponse = JsonRpcResponse<ChannelResult>;

// GetState
export interface GetStateParams {
  channelId: ChannelId;
}
export type GetStateRequest = JsonRpcRequest<'GetState', GetStateParams>;
export type GetStateResponse = JsonRpcResponse<ChannelResult>;

// PushMessage
export type PushMessageParams = PushMessageRequest['params']; // included for backwards compatibility
export type PushMessageResult = {success: boolean};
export type PushMessageRequest = JsonRpcRequest<'PushMessage', Message>;
export type PushMessageResponse = JsonRpcResponse<PushMessageResult>;

// CloseChannel
export interface CloseChannelParams {
  channelId: ChannelId;
}
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParams>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;

// ChallengeChannel
export type ChallengeChannelParams = ChallengeChannelRequest['params']; // for backwards compatibility
export type ChallengeChannelRequest = JsonRpcRequest<'ChallengeChannel', {channelId: ChannelId}>;
export type ChallengeChannelResponse = JsonRpcResponse<ChannelResult>;

// Budget

export interface ChannelBudget {
  channelId: Bytes32;
  amount: Uint256;
}

export interface TokenBudget {
  token: Address;
  availableReceiveCapacity: Uint256;
  availableSendCapacity: Uint256;
  channels: ChannelBudget[];
}
export interface SiteBudget {
  domain: string;
  hubAddress: string;
  budgets: TokenBudget[];
}

export interface TokenBudgetRequest {
  hub: Participant;
  playerParticipantId: string;
  token: Address;
  requestedSendCapacity: Uint256;
  requestedReceiveCapacity: Uint256;
}
export type GetBudgetRequest = JsonRpcRequest<'GetBudget', {hubAddress: Address}>;
export type GetBudgetResponse = JsonRpcResponse<SiteBudget | {}>;

export type ApproveBudgetAndFundRequest = JsonRpcRequest<
  'ApproveBudgetAndFund',
  TokenBudgetRequest
>;
export type ApproveBudgetAndFundResponse = JsonRpcResponse<SiteBudget>;

export type CloseAndWithdrawParams = {hub: Participant; playerParticipantId: string};
export type CloseAndWithdrawRequest = JsonRpcRequest<'CloseAndWithdraw', CloseAndWithdrawParams>;
export type CloseAndWithdrawResponse = JsonRpcResponse<{success: boolean}>;

export type GetBudgetParams = {hubAddress: string};
// Notifications
// these notifications come *from* the wallet, which is not strictly how JSON-RPC should work
// (since we treat the wallet as the 'server')
export type ChannelProposedNotification = JsonRpcNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRpcNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRpcNotification<'ChannelClosed', ChannelResult>;
export type MessageQueuedNotification = JsonRpcNotification<'MessageQueued', Message>;
export type BudgetUpdatedNotification = JsonRpcNotification<'BudgetUpdated', SiteBudget>;
export type UiNotification = JsonRpcNotification<'UIUpdate', {showWallet: boolean}>;

export type Notification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | BudgetUpdatedNotification
  | MessageQueuedNotification
  | UiNotification;

type FilterByMethod<T, Method> = T extends {method: Method} ? T : never;

export type NotificationType = {
  [T in Notification['method']]: [FilterByMethod<Notification, T>['params']];
};

export type Request =
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | GetWalletInformationRequest
  | EnableEthereumRequest
  | GetStateRequest
  | PushMessageRequest
  | ChallengeChannelRequest
  | GetBudgetRequest
  | ApproveBudgetAndFundRequest
  | CloseChannelRequest
  | CloseAndWithdrawRequest;

export type Response =
  | CreateChannelResponse
  | JoinChannelResponse
  | UpdateChannelResponse
  | GetWalletInformationResponse
  | EnableEthereumResponse
  | GetStateResponse
  | PushMessageResponse
  | ChallengeChannelResponse
  | GetBudgetResponse
  | CloseChannelResponse
  | ApproveBudgetAndFundResponse
  | CloseAndWithdrawResponse;

export type ErrorResponse = EnableEthereumError;

export type JsonRpcMessage = Request | Response | Notification | ErrorResponse;

export function isResponse(message: JsonRpcMessage): message is Response {
  return 'id' in message && 'result' in message;
}

export function isNotification(message: JsonRpcMessage): message is Notification {
  return !('id' in message);
}
export function isRequest(message: JsonRpcMessage): message is Request {
  return 'id' in message && 'params' in message;
}

export function isError(message: JsonRpcMessage): message is ErrorResponse {
  return 'id' in message && 'error' in message;
}
