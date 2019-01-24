export interface OpenGame {
  address: string;
  name: string;
  stake: string;
  isPublic: boolean;
  createdAt: number;
}

export type OpenGameState = OpenGame[];
