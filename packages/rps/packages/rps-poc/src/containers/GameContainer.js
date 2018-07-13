import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getApplicationState } from '../reducers';
import PlayPage from '../components/PlayPage';

const GameContainer = ({applicationState}) => (
  <PlayPage />
)

GameContainer.propTypes = {
  applicationState: PropTypes.object.isRequired,
}

const mapStateToProps = (state) => ({
  applicationState: getApplicationState(state),
})

export default connect(
  mapStateToProps,
)(GameContainer)
