import React from 'react';
import {FormButton} from '../../form';
import './ShareFile.scss';
import {prettyPrintWei, calculateWei} from '../../../utils/calculateWei';
import prettier from 'prettier-bytes';
import {useHistory} from 'react-router-dom';
import {generateURL} from '../../../utils/url';
import {TorrentUI} from '../../../types';

export type ShareFileProps = {file: TorrentUI};

const ShareFile: React.FC<ShareFileProps> = ({file}: ShareFileProps) => {
  const history = useHistory();
  return (
    <tr className={'share-file'}>
      <td className="name-cell">{file.name}</td>
      <td className="other-cell">{prettier(file.length)}</td>
      <td className="other-cell">{prettyPrintWei(calculateWei(file.length))}</td>
      <td className="button-cell">
        <FormButton name="download" onClick={() => history.push(generateURL(file))}>
          Download
        </FormButton>
      </td>
    </tr>
  );
};

export {ShareFile};
