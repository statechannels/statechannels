import React from 'react';

import {Torrent} from '../../../types';
import {FormButton} from '../../form';
import './DownloadInfo.scss';
import {ProgressBar} from './progress-bar/ProgressBar';

export type DownloadInfoProps = {torrent: Torrent};

const DownloadInfo: React.FC<DownloadInfoProps> = ({torrent}: DownloadInfoProps) => {
  return (
    <section className="downloadingInfo">
      <ProgressBar
        downloaded={torrent.downloaded || 0}
        size={torrent.length || 0}
        status={torrent.downloaded !== torrent.length ? 'Downloading' : 'Completed'}
      />
      <p>
        ETA 1m30s. 500Kbits/s down, 500Kbits/s up <br />
        Connected to <strong>10</strong> peers.
      </p>
      {torrent.downloaded !== torrent.length ? (
        false
      ) : (
        <FormButton name="save-download" onClick={() => null}>
          Save Download
        </FormButton>
      )}
    </section>
  );
};

export {DownloadInfo};
