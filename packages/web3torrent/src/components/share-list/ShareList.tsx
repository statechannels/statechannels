import React from 'react';
import {RoutePath} from '../../routes';
import {Torrent} from '../../types';
import {ShareFile} from './share-file/ShareFile';
import './ShareList.scss';
import {useHistory} from 'react-router-dom';

export type ShareListProps = {torrents: Array<Partial<Torrent>>};

const ShareList: React.FC<ShareListProps> = ({torrents}) => {
  const history = useHistory();
  return (
    <table className="share-list">
      <tbody>
        {torrents.length
          ? torrents.map(file => (
              <ShareFile
                file={file}
                key={file.name}
                goTo={hash => history.push(`${RoutePath.File}#${hash}`)}
              />
            ))
          : false}
      </tbody>
    </table>
  );
};

export {ShareList};
