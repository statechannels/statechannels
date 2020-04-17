import React from 'react';
import {ShareFile} from './share-file/ShareFile';
import './ShareList.scss';
import {TorrentUI} from '../../types';

export type ShareListProps = {torrents: Array<TorrentUI>};

export const ShareList: React.FC<ShareListProps> = ({torrents}) => {
  return (
    <table className="share-list">
      <tbody>
        {torrents.map(file => (
          <ShareFile file={file} key={file.name} />
        ))}
      </tbody>
    </table>
  );
};
