import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import './Upload.scss';

const Upload: React.FC<RouteComponentProps> = () => {
  return (
    <section className="section fill">
      <div className="jumbotron-upload"></div>
      <div className="upload-action-bar">
        <label htmlFor="file">Select file to upload</label>
        <input type="file" name="file" id="file" className="inputfile"></input>
        <FormButton name="start" onClick={() => null}>
          Start
        </FormButton>
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
