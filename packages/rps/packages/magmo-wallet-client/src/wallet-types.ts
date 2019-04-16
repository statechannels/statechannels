export type WalletMessagePayload = ProtocolPayload | ProcessPayload;
export interface ProtocolPayload {
  protocol: string;
  data: any;
}

export interface ProcessPayload {
  processId: string;
  data: any;
}
