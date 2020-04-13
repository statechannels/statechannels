import React from 'react';
import {Torrent} from '../../../types';
import {FormButton} from '../../form';
import './ShareFile.scss';
import {prettyPrintWei, calculateWei} from '../../../utils/calculateWei';
import prettier from 'prettier-bytes';
import {RoutePath} from '../../../routes';
import {useHistory} from 'react-router-dom';

export type ShareFileProps = {file: Partial<Torrent>};

const ShareFile: React.FC<ShareFileProps> = ({file}: ShareFileProps) => {
  const history = useHistory();
  return (
    <tr className={'share-file'}>
      <td className="name-cell">{file.name}</td>
      <td className="other-cell">{prettier(file.length)}</td>
      <td className="other-cell">{prettyPrintWei(calculateWei(file.length))}</td>
      <td className="button-cell">
        <FormButton
          name="download"
          onClick={() => history.push(`${RoutePath.File}#${file.magnetURI || file.name || ''}`)}
        >
          Download
        </FormButton>
      </td>
    </tr>
  );
};

export {ShareFile};
