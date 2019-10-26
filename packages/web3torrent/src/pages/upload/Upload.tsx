import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {upload} from '../../clients/web3torrent-client';
import {generateMagnetURL} from '../../utils/magnet';
import './Upload.scss';

const Upload: React.FC<RouteComponentProps> = ({history}) => {
  return (
    <section className="section fill">
      <div className="jumbotron-upload"></div>
      <div className="upload-action-bar">
        <label htmlFor="file">Select file to upload</label>
        <input
          type="file"
          name="file"
          id="file"
          className="inputfile"
          onChange={async event => {
            if (event.target.files && event.target.files[0]) {
              const file = event.target.files[0];
              const seedingTorrent = await upload(file);
              console.log('seedingTorrent', seedingTorrent.infoHash);
              history.push(generateMagnetURL(seedingTorrent));
            }
          }}
        ></input>
      </div>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
    </section>
  );
};

export default Upload;
// "f589b494bd2e2f45de823e4d21a88a01ffd4f0de"
// "f589b494bd2e2f45de823e4d21a88a01ffd4f0de"
