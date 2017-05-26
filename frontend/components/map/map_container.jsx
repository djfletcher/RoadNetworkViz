import { connect } from 'react-redux';
import { requestCrimes } from '../../actions/crime_actions';
import { requestNeighborhoods } from '../../actions/neighborhood_actions';
import DataMap from './map';

const mapStateToProps = ({ crime, neighborhoods }) => ({
  crimes: crime,
  neighborhoods
});

const mapDispatchToProps = dispatch => ({
  requestCrimes: () => dispatch(requestCrimes()),
  requestNeighborhoodLines: () => dispatch(requestNeighborhoods())
});

export default connect(mapStateToProps, mapDispatchToProps)(DataMap);
