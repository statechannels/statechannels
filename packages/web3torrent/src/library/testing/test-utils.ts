import MemoryChunkStore from 'memory-chunk-store';
import fixtures from 'webtorrent-fixtures';

export const defaultFile = new Blob([fixtures.leaves.content]);
export const defaultTorrentHash = fixtures.leaves.parsedTorrent.infoHash;
export const defaultFileMagnetURI = `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent(
  process.env.TRACKER_URL as string
)}`;
export const defaultSeedingOptions = (randomizeName = true) => ({
  name: (randomizeName ? Math.random() * 1000 : '') + 'Leaves of Grass by Walt Whitman.epub',
  announce: [process.env.TRACKER_URL],
  store: MemoryChunkStore
});

export const defaultLeechingOptions = {
  name: 'Leaves of Grass by Walt Whitman.epub',
  store: MemoryChunkStore
};
