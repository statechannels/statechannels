export interface OpenGame {
  // The address used for the `participant` in the channel, for signing states
  address: string;
  // The address used in the Outcome associated with that participant, e.g., Metamask wallet
  outcomeAddress: string;
  name: string;
  stake: string;
  isPublic: boolean;
  createdAt: number;
}

export type OpenGameState = OpenGame[];
