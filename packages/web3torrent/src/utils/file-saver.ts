import jszip from 'jszip';
import {TorrentFile} from 'webtorrent';

export type SavingData = {name: string; content: string};

export const getFileBlob: (file: TorrentFile) => Promise<Blob> = file => {
  return new Promise(resolve => file.getBlob((_, blob) => resolve(blob as Blob)));
};

export const getFileBlobURL: (file: TorrentFile) => Promise<string> = file => {
  return new Promise(resolve => file.getBlobURL((_, blob) => resolve(blob as string)));
};

export const getFileSavingData: (
  files: TorrentFile[],
  fileName: string
) => Promise<SavingData> = async (files, fileName) => {
  if (!files.length) {
    return Promise.reject();
  }
  if (files.length === 1 && files[0].getBlobURL) {
    return Promise.resolve({name: files[0].name, content: await getFileBlobURL(files[0])});
  }
  const zip = new jszip();
  for (const file of files) {
    await zip.file(file.name, await getFileBlob(file));
  }
  return zip
    .generateAsync({
      type: 'blob'
    })
    .then(data => ({
      content: URL.createObjectURL(data),
      name: fileName
    }));
};
