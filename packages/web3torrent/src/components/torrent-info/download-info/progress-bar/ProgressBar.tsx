import prettier from 'prettier-bytes';
import React from 'react';
import './ProgressBar.scss';
import {TorrentUI} from '../../../../types';

export type ProgressBarProps = Pick<TorrentUI, 'downloaded' | 'length' | 'status'>;

export const ProgressBar: React.FC<ProgressBarProps> = ({downloaded, length, status}) => {
  let classStatus: string;
  if (downloaded === length) {
    classStatus = 'complete';
  } else if (downloaded > 0 && downloaded < length) {
    classStatus = 'downloading';
  }
  return (
    <div className="progress-bar">
      <div className={`positive ${classStatus}`} style={{width: `${(downloaded / length) * 100}%`}}>
        <span className="bar-progress">
          {prettier(downloaded)}/{prettier(length)}
        </span>
        <span className="bar-status">{status}</span>
      </div>
      <div className="negative">
        <span className="bar-progress">
          {prettier(downloaded)}/{prettier(length)}
        </span>
        <span className="bar-status">{status}</span>
      </div>
    </div>
  );
};
