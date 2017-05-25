import * as ApiUtil from '../util/crime_api_util';

export const RECEIVE_CRIMES = 'RECEIVE_CRIMES';

export const receiveCrimes = crimes => ({
  action: RECEIVE_CRIMES,
  crimes
});

export const requestCrimes = () => dispatch => {
  for (let offset = 0; offset < 5; offset++) {
    ApiUtil.fetchCrimes(offset * 1000)
           .then(crimes => dispatch(receiveCrimes(crimes)));
  }
};
