import React from 'react';
import {Torrent} from '../../../types';
import {FormButton} from '../../form';
import './ShareFile.scss';

export type ShareFileProps = {file: Partial<Torrent>; goTo: (name: string) => void};

const ShareFile: React.FC<ShareFileProps> = ({file, goTo}: ShareFileProps) => {
  return (
    <tr className={'share-file'}>
      <td className="name-cell">{file.name}</td>
      <td className="other-cell">{file.length}Mb</td>
      <td className="other-cell">{file.numPeers}S</td>
      <td className="other-cell">{file.numPeers}P</td>
      {/* <td className="other-cell">${cost}</td>  TODO reinstate this cell when we have a wer-per-byte model implpemented*/}
      <td className="button-cell">
        <FormButton name="download" onClick={() => goTo(file.magnetURI || file.name || '')}>
          Download
        </FormButton>
      </td>
    </tr>
  );
};

export {ShareFile};
