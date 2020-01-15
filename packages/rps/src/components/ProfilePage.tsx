import _ from 'lodash';
import React from 'react';

import {Button, Form, FormGroup, Label, Input} from 'reactstrap';
import {Modal, ModalBody} from 'reactstrap';
import {MetaMaskButton} from 'rimble-ui';

interface Props {
  updateProfile: (name: string, twitterHandle?: string) => void;
  logout: () => void;
}

interface State {
  name: string;

  nameErrorMessage: string;
}

export default class ProfilePage extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props);
    this.state = {name: '', nameErrorMessage: ''};
    this.updateProfileHandler = this.updateProfileHandler.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
  }

  handleNameChange(e) {
    const name = e.target.value;
    let nameErrorMessage = '';
    if (name === '') {
      nameErrorMessage = 'Please enter a name';
    }
    if (!/^[a-zA-Z0-9 ]*$/.test(name)) {
      nameErrorMessage = 'Please use only alphanumeric characters for your name';
    }
    if (name.length > 20) {
      nameErrorMessage = 'Please use a name less than 20 characters';
    }
    this.setState({name, nameErrorMessage});
  }

  updateProfileHandler(e) {
    e.preventDefault();
    if (this.state.nameErrorMessage === '') {
      this.props.updateProfile(this.state.name);
    }
  }

  render() {
    const submitEnabled = this.state.nameErrorMessage === '' && this.state.name !== '';
    return (
      <Modal className="cog-container" isOpen={true} centered={true}>
        <div className="modal-content">
          <div className="modal-header rules-header">
            <h5 className="modal-title">Tell us your name!</h5>
            <Button className="close" onClick={e => this.props.logout()} aria-label="close">
              <span aria-hidden="true">&times;</span>
            </Button>
          </div>

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
                <small className="form-text text-muted">This will display to other players.</small>
                <small className="form-text text-danger">{this.state.nameErrorMessage}</small>
              </FormGroup>
              <MetaMaskButton.Outline disabled={!submitEnabled}>
                Connect with MetaMask
              </MetaMaskButton.Outline>
            </Form>
          </ModalBody>
        </div>
      </Modal>
    );
  }
}
