import React, {useState} from 'react';
import {useHistory} from 'react-router-dom';
import {upload} from '../../clients/web3torrent-client';
import {generateURL} from '../../utils/url';
import './Upload.scss';
import {Spinner} from '../../components/form/spinner/Spinner';
import {getUserFriendlyError} from '../../utils/error';
import {Flash} from 'rimble-ui';

const Upload: React.FC<{ready: boolean}> = ({ready}) => {
  const history = useHistory();
  const [showSpinner, setSpinner] = useState<boolean>(false);
  const [errorLabel, setErrorLabel] = useState('');
  return (
    <section className="section fill">
      <div className="jumbotron-upload">
        <h1>Upload a File</h1>
      </div>

      <div className={`upload-action-bar ${showSpinner ? 'hide' : 'show'}`}>
        <label htmlFor="file">Select file to upload</label>
        <input
          type="file"
          name="file"
          id="file"
          multiple={true}
          disabled={!ready}
          className="inputfile"
          onChange={async event => {
            if (event.target.files && event.target.files[0]) {
              setSpinner(true);
              setErrorLabel('');
              try {
                const {infoHash, length, name} = await upload(event.target.files);
                history.push(generateURL({infoHash, length, name}));
              } catch (error) {
                setSpinner(false);
                setErrorLabel(getUserFriendlyError(error.code));
              }
            }
          }}
        ></input>
      </div>
      {errorLabel && errorLabel !== '' && (
        <Flash mx="auto" variant="danger">
          {errorLabel}
        </Flash>
      )}
      <div className={`loading-torrent ${showSpinner ? 'show' : 'hide'}`}>
        Setting up your Torrent
        <Spinner visible color="orange" content="Setting up your torrent!"></Spinner>
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
          whomever you want to share the file with.
        </p>
      </div>
    </section>
  );
};

export default Upload;
