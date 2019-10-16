import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {ShareList} from '../../components/share-list/ShareList';
import {RoutePath} from '../../routes';
import {Torrent} from '../../types';
import './Welcome.scss';

const mockTorrents: Array<Partial<Torrent>> = [
  {name: 'Sample_1.dat', length: 350, numSeeds: 27, numPeers: 350, cost: '0.5', files: []},
  {name: 'Sample_2.dat', length: 250, numSeeds: 35, numPeers: 400, cost: '0.5', files: []},
  {name: 'Sample_3.dat', length: 50, numSeeds: 2, numPeers: 360, cost: '0.5', files: []}
];
const Welcome: React.FC<RouteComponentProps> = ({history}) => {
  return (
    <section className="section fill">
      <div className="jumbotron"></div>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
      <h2>Download a sample file</h2>
      <ShareList torrents={mockTorrents} history={history} />
      <h2>Or share a file</h2>
      <FormButton name="upload" block={true} onClick={() => history.push(RoutePath.Upload)}>
        Upload
      </FormButton>
    </section>
  );
};

export default Welcome;
