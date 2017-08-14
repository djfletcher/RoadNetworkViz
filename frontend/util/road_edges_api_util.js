export const fetchRoadEdges = offset => (
  $.ajax({
    url: 'http://road-network-api.herokuapp.com/road_edges',
    data: {
      '$offset': offset
    }
  })
);
