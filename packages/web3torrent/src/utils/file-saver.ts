import jszip from 'jszip';
import {getFileBlob, getFileBlobURL, web3torrent} from '../clients/web3torrent-client';

export type SavingData = {name: string; content: string};

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
      type: 'base64'
    })
    .then(dataURI => ({
      content: 'data:application/zip;base64,' + dataURI,
      name: 'torrent.zip'
    }));
};
