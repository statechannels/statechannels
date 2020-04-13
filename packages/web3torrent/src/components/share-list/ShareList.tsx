import React from 'react';
import {Torrent} from '../../types';
import {ShareFile} from './share-file/ShareFile';
import './ShareList.scss';

export type ShareListProps = {torrents: Array<Partial<Torrent>>};

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
