import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {upload} from '../../clients/web3torrent-client';
import {generateMagnetURL} from '../../utils/magnet';
import './Upload.scss';

const Upload: React.FC<RouteComponentProps> = ({history}) => {
  return (
    <section className="section fill">
      <div className="jumbotron-upload">
        <h1>Upload a File</h1>
      </div>
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
              history.push(generateMagnetURL(seedingTorrent));
            }
          }}
        ></input>
      </div>
      <div className="subtitle">
        <p>
          <strong>What kind of files can I share?</strong>
          <br />
          Any kind! Just make sure you're not sharing copyrighted material, or if you do, that
          you're legally allowed to do so.
        </p>
        <p>
          <strong>How do others download my file?</strong>
          <br />
          Use the "Share Link" button or copy this browser tab's URL, and send that address to
          whoever you want to share the file with.
        </p>
      </div>
    </section>
  );
};

export default Upload;
