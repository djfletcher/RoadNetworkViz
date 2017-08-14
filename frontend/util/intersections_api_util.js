export const fetchIntersections = offset => (
  $.ajax({
    url: 'http://road-network-api.herokuapp.com/intersections',
    data: {
      '$offset': offset
    }
  })
);
