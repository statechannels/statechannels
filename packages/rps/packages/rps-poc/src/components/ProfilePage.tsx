import _ from 'lodash';
import React from 'react';

import { Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

interface Props {
  updateProfile: (name: string, twitterHandle?: string) => void;
  logout: () => void;
}

interface State {
  name: string;
  twitterHandle: string;
  twitterErrorMessage: string;
  nameErrorMessage: string;
}


export default class ProfilePage extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props);
    this.state = { name: "", twitterHandle: "", twitterErrorMessage: "", nameErrorMessage: "" };
    this.updateProfileHandler = this.updateProfileHandler.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleTwitterChange = this.handleTwitterChange.bind(this);
  }

  handleNameChange(e) {
    const name = e.target.value;
    let nameErrorMessage = "";
    if (name === "") {
      nameErrorMessage = "Please enter a name";
    }
    if (!/^[a-zA-Z0-9]*$/.test(name)) {
      nameErrorMessage = "Please use only alphanumeric characters for your name";
    }
    if (name.length>20){
      nameErrorMessage="Please use a name less than 20 characters";
    }
    this.setState({ name, nameErrorMessage });
  }

  handleTwitterChange(e) {
    const twitterHandle = e.target.value;
    let twitterErrorMessage = "";
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(twitterHandle) && twitterHandle !== "") {
      twitterErrorMessage = `${twitterHandle} is not a valid twitter handle`;
    }
    this.setState({ twitterErrorMessage, twitterHandle: e.target.value });
  }

  updateProfileHandler(e) {
    e.preventDefault();
    if (this.state.nameErrorMessage === "" && this.state.twitterErrorMessage === "") {
      this.props.updateProfile(this.state.name, this.state.twitterHandle);
    }
  }

  render() {
    const submitEnabled = this.state.nameErrorMessage === "" && this.state.twitterErrorMessage === "" && this.state.name !== "";
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
              <small className="form-text text-danger">
                {this.state.nameErrorMessage}
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
              <small className="form-text text-danger">
                {this.state.twitterErrorMessage}
              </small>
            </FormGroup>
            <Button className="profile-button" disabled={!submitEnabled} >
              Submit
          </Button>
            <Button className="profile-button" onClick={(e) => this.props.logout()}>Logout</Button>
          </Form>
        </ModalBody>
      </Modal>
    );
  }
}
