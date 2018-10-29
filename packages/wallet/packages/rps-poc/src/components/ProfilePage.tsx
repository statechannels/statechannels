import _ from 'lodash';
import React from 'react';

import { Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

interface Props {
  updateProfile: (name: string, twitterHandle?: string) => void;
}

interface State {
  name: string;
  twitterHandle: string;
}


export default class ProfilePage extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props);
    this.state = { name: "", twitterHandle: "" };
    this.updateProfileHandler = this.updateProfileHandler.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleTwitterChange = this.handleTwitterChange.bind(this);
  }

  handleNameChange(e) {
    this.setState({ name: e.target.value });
  }

  handleTwitterChange(e) {
    this.setState({ twitterHandle: e.target.value });
  }


  updateProfileHandler(e) {
    e.preventDefault();
    this.props.updateProfile(this.state.name, this.state.twitterHandle);
  }

  render() {
    return (
      <Modal className="cog-container" isOpen={true} centered={true}>
        <ModalHeader className="rules-header">
          Set your name!
        </ModalHeader>

        <ModalBody>

          <Form className="form-profile" onSubmit={e => this.updateProfileHandler(e)}>
            <FormGroup>
              <Label for="name">Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                value={this.state.name}
                onChange={e => this.handleNameChange(e)}
              />
              <small className="form-text text-muted">
                This will display to other players.
              </small>
            </FormGroup>
            <FormGroup>
              <Label for="twitterHandle">Twitter handle [optional]</Label>
              <Input
                type="text"
                name="twitterHandle"
                id="twitterHandle"
                value={this.state.twitterHandle}
                onChange={e => this.handleTwitterChange(e)}
              />
              <small className="form-text text-muted">
                This will be used for your twitter shout-out if you beat the psychic bot.
              </small>
            </FormGroup>
            <Button>
              Submit
          </Button>
          </Form>
        </ModalBody>
      </Modal>
    );
  }
}
