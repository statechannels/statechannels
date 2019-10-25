import React, {useState} from 'react';
import {Torrent} from '../../../types';
import {clipboardCopy} from '../../../utils/copy-to-clipboard';
import {generateMagnetURL} from '../../../utils/magnet';

export type MagnetLinkButtonProps = {torrent: Torrent};

export const MagnetLinkButton: React.FC<MagnetLinkButtonProps> = ({torrent}) => {
  const [magnetInfo, setMagnetInfo] = useState({
    copied: false,
    magnet: generateMagnetURL(torrent)
  });

  return (
    <a
      href={magnetInfo.magnet}
      className="fileLink"
      type="button"
      onClick={event => {
        event.preventDefault();
        clipboardCopy(magnetInfo.magnet);
        setMagnetInfo({...magnetInfo, copied: true});
        setTimeout(() => setMagnetInfo({...magnetInfo, copied: false}), 3000);
      }}
    >
      <span className={'tooltiptext ' + magnetInfo.copied}>
        {magnetInfo.copied ? 'Great! Copied to your clipboard' : 'Copy to clipboard'}
      </span>
      Share Link
    </a>
  );
};
