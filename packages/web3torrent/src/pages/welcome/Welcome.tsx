import React from "react";
import { RouteComponentProps } from "react-router-dom";
import { FormButton } from "../../components/form";
import { ShareList } from "../../components/share-list/ShareList";
import { RoutePath } from "../../routes";
import "./Welcome.scss";

const mockFiles = [
  { filename: "Sample_1.dat", size: 350, seeders: 27, peers: 350, cost: 0.5 },
  { filename: "Sample_2.dat", size: 250, seeders: 35, peers: 400, cost: 0.5 },
  { filename: "Sample_3.dat", size: 50, seeders: 2, peers: 360, cost: 0.5 }
];
const Welcome: React.FC<RouteComponentProps> = ({ history }) => {
  return (
    <section className="section fill">
      <div className="jumbotron"></div>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>
      </div>
      <h2>Download a sample file</h2>
      <ShareList files={mockFiles} />
      <h2>Or share a file</h2>
      <FormButton name="setup" block={true} onClick={() => history.push(RoutePath.Root)}>
        Upload
      </FormButton>
    </section>
  );
};

export default Welcome;
