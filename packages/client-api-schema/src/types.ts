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

interface JsonRpcRequest<MethodName, RequestParams> {
  id: number; // in the json-rpc spec this is optional, but we require it for all our requests
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
  amount: string; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  token: Address; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

export type Allocations = Allocation[]; // included for backwards compatibility

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Message<T = any> {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: T; // Message payload. Format defined by wallet and opaque to app.
  // But useful to be able to specify, for the purposes of the fake-client
}

export interface Funds {
  token: Address;
  amount: string;
}

export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: Address;
  channelId: ChannelId;
  status: ChannelStatus;
  turnNum: string;
  challengeExpirationTime?: number;
}

interface Balance {
  playerAmount: string;
  hubAmount: string;
}

// WalletVersion
export type WalletVersionRequest = JsonRpcRequest<'WalletVersion', {}>;
export type WalletVersionResponse = JsonRpcResponse<string>;

// EnableEthereum
export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<Address>;

// GetAddress
export type GetAddressRequest = JsonRpcRequest<'GetAddress', {}>; // todo: what are params
export type GetAddressResponse = JsonRpcResponse<Address>;
export type GetAddressError = JsonRpcError<100, 'Ethereum Not Enabled'>; // TODO: how should we choose error codes

// GetEthereumSelectedAddress
export type GetEthereumSelectedAddressRequest = JsonRpcRequest<'GetEthereumSelectedAddress', {}>; // todo: what are params
export type GetEthereumSelectedAddressResponse = JsonRpcResponse<Address>;

// CreateChannel
export interface CreateChannelParams {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: Address;
  appData: string;
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
export interface TokenBudget {
  token: string;
  pending: Balance;
  free: Balance;
  inUse: Balance;
  direct: Balance;
}
export interface SiteBudget {
  site: string;
  hub: string;
  budgets: TokenBudget[];
}

export interface BudgetRequest extends Balance {
  site: string;
  player: Participant;
  hub: Participant;
}
export type GetBudgetRequest = JsonRpcRequest<'GetBudget', {hubAddress: Address}>;
export type GetBudgetResponse = JsonRpcResponse<SiteBudget | {}>;

export type ApproveBudgetAndFundRequest = JsonRpcRequest<'ApproveBudgetAndFund', BudgetRequest>;
export type ApproveBudgetAndFundResponse = JsonRpcResponse<SiteBudget>;

export type CloseAndWithdrawParams = {site: string; player: Participant; hub: Participant};
export type CloseAndWithdrawRequest = JsonRpcRequest<'CloseAndWithdraw', CloseAndWithdrawParams>;
export type CloseAndWithdrawResponse = JsonRpcResponse<{success: boolean}>;
// Notifications
export type ChannelProposedNotification = JsonRpcNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRpcNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRpcNotification<'ChannelClosed', ChannelResult>;
export type MessageQueuedNotification = JsonRpcNotification<'MessageQueued', Message>;
export type BudgetUpdatedNotification = JsonRpcNotification<'BudgetUpdated', SiteBudget>;

export type Notification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | BudgetUpdatedNotification
  | MessageQueuedNotification;

export type Request =
  | GetAddressRequest
  | GetEthereumSelectedAddressRequest
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | WalletVersionRequest
  | EnableEthereumRequest
  | GetStateRequest
  | PushMessageRequest
  | ChallengeChannelRequest
  | GetBudgetRequest
  | ApproveBudgetAndFundRequest
  | CloseChannelRequest
  | CloseAndWithdrawRequest;

export type Response =
  | GetAddressResponse
  | GetEthereumSelectedAddressResponse
  | CreateChannelResponse
  | JoinChannelResponse
  | UpdateChannelResponse
  | WalletVersionResponse
  | EnableEthereumResponse
  | GetStateResponse
  | PushMessageResponse
  | ChallengeChannelResponse
  | GetBudgetResponse
  | CloseChannelResponse
  | ApproveBudgetAndFundResponse
  | CloseAndWithdrawResponse;

export type ErrorResponse = GetAddressError;

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
