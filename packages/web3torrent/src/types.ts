export type Torrent = {
  name?: string;
  filename?: string;
  magnetURI?: string;
  torrentFile?: Buffer;
  downloaded?: number; // in bytes
  uploaded?: number; // in bytes
  downloadSpeed?: number; // in bytes/s
  uploadSpeed?: number; // in bytes/s
  progress?: number; // from 0 to 1
  numPeers?: number;
  numSeeds?: number;
  done?: boolean;
  files: TorrentFile[];
  length: number; // Sum of the files length (in bytes).
  cost?: number;
  status?: 'Downloading' | 'Seeding' | 'Completed' | 'Idle';
};

export type TorrentFile = {
  name: string;
  path?: string;
  length?: number; // in bytes
  downloaded?: number; // in bytes
  progress?: number; // from 0 to 1
  getBlobURL?: (err, url) => void;
};
