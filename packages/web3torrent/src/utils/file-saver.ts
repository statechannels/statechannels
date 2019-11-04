import jszip from 'jszip';
import {web3torrent} from '../clients/web3torrent-client';
import {TorrentFile} from 'webtorrent';

export type SavingData = {name: string; content: string};

export const getFileBlob: (file: TorrentFile) => Promise<Blob> = file => {
  return new Promise(resolve => file.getBlob((_, blob) => resolve(blob as Blob)));
};

export const getFileBlobURL: (file: TorrentFile) => Promise<string> = file => {
  return new Promise(resolve => file.getBlobURL((_, blob) => resolve(blob as string)));
};

export const getFileSavingData: (infoHash: string) => Promise<SavingData> = async infoHash => {
  const torrent = web3torrent.get(infoHash);
  if (!torrent || !torrent.done || !torrent.files.length) {
    return Promise.reject();
  }
  if (torrent.files.length === 1 && torrent.files[0].getBlobURL) {
    return Promise.resolve({
      content: await getFileBlobURL(torrent.files[0]),
      name: torrent.name
    });
  }
  const zip = new jszip();
  for (const file of torrent.files) {
    await zip.file(file.name, await getFileBlob(file));
  }
  return zip
    .generateAsync({
      type: 'blob'
    })
    .then(data => ({
      content: URL.createObjectURL(data),
      name: 'torrent.zip'
    }));
};
