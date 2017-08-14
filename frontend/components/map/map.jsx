import React from 'react';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import createLayer from './map_layer';
// import { getBbox, countCrimes } from './gis_calculations';
import mapOverlay from './map_overlay';

class DataMap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      statsMemo: {},
      statsDisplayed: {
        neighborhood: '',
        stats: {}
      },
      hoverEffects: true
    };
    this.requestData = this.requestData.bind(this);
    this.makeInteractive = this.makeInteractive.bind(this);
    this.addHoverEffects = this.addHoverEffects.bind(this);
    this.colorNeighborhoodFill = this.colorNeighborhoodFill.bind(this);
    this.clearNeighborhoodFill = this.clearNeighborhoodFill.bind(this);
    this.addClickEffects = this.addClickEffects.bind(this);
    this.getStats = this.getStats.bind(this);
    this.memoizeStats = this.memoizeStats.bind(this);
    this.updateStatsDisplayed = this.updateStatsDisplayed.bind(this);
    this.addLayer = this.addLayer.bind(this);
    this.handleToggle = this.handleToggle.bind(this);
    this.toggleNeighborhoods = this.toggleNeighborhoods.bind(this);
    this.toggleLayerVisibility = this.toggleLayerVisibility.bind(this);
  }

  componentDidMount() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGpmbGV0Y2hlciIsImEiOiJjajMzYzFybjkwMDR3MnFvOXZxZ2V1bmZ1In0.2c-Ohy79yPFGOdmEcLOk7w';
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/djfletcher/cj369eru100002rpkokn2981h',
      center: [-122.447303, 37.768874],
      zoom: 12,
      maxBounds: [[-123.255444, 37.291841], [-121.182195, 38.166895]]
    });

    this.requestData();
    window.map = this.map;
  }

  componentWillReceiveProps(nextProps) {
    let {
      crimesLoaded,
      neighborhoodsLoaded,
      intersectionsLoaded,
      roadEdgesLoaded
    } = this.arePropsLoaded(nextProps);
    let layer;
    if (crimesLoaded) {
      layer = createLayer('crime', nextProps.crimes);
      this.addLayer(layer);
    }
    if (neighborhoodsLoaded) {
      layer = createLayer('neighborhood-outlines', nextProps.neighborhoods);
      this.addLayer(layer);
      layer = createLayer('neighborhoods', nextProps.neighborhoods);
      this.addLayer(layer);
      layer = createLayer('neighborhood-fills', nextProps.neighborhoods);
      this.addLayer(layer);
      this.makeInteractive();
    }
    if (intersectionsLoaded) {
     layer = createLayer('intersections', nextProps.intersections);
     this.addLayer(layer);
    }
    if (roadEdgesLoaded) {
      let roadEdges = this.getRoadEdgesAsGeoJSON(
        nextProps.roadEdges,
        nextProps.intersections
      );
      layer = createLayer('road-edges', roadEdges);
      this.addLayer(layer);
    }
  }

  arePropsLoaded(nextProps) {
    let crimesLoaded, neighborhoodsLoaded, intersectionsLoaded, roadEdgesLoaded;
    crimesLoaded = nextProps.crimes.length > 5000 && nextProps.crimes.length !== this.props.crimes.length;
    neighborhoodsLoaded = !$.isEmptyObject(nextProps.neighborhoods) && $.isEmptyObject(this.props.neighborhoods);
    intersectionsLoaded = Object.keys(nextProps.intersections).length > 25000 && Object.keys(nextProps.intersections).length !== Object.keys(this.props.intersections).length;
    roadEdgesLoaded = nextProps.roadEdges.length > 40000 && nextProps.roadEdges.length !== this.props.roadEdges.length;
    return { crimesLoaded, neighborhoodsLoaded, intersectionsLoaded, roadEdgesLoaded };
  }

  requestData() {
    // this.props.requestCrimes();
    // this.props.requestNeighborhoods();
    this.props.requestIntersections();
    this.props.requestRoadEdges();
  }

  makeInteractive() {
    this.addHoverEffects();
    this.addClickEffects();
  }

  addHoverEffects() {
    // When the user moves their mouse over the neighborhood-fills, update the filter
    // to only show the matching neighborhood, thus making a hover effect.
    this.map.on("mousemove", "neighborhoods", this.colorNeighborhoodFill);

    // Reset the neighborhoods's filter when the mouse leaves the layer.
    this.map.on("mouseleave", "neighborhoods", this.clearNeighborhoodFill);
  }

  removeHoverEffects() {
    this.map.off("mousemove", "neighborhoods", this.colorNeighborhoodFill);
    this.map.off("mouseleave", "neighborhoods", this.clearNeighborhoodFill);
  }

  colorNeighborhoodFill(e) {
    this.map.setFilter("neighborhood-fills", ["==", "name", e.features[0].properties.name]);
    this.map.getCanvas().style.cursor = 'pointer';
  }

  clearNeighborhoodFill() {
    this.map.setFilter("neighborhood-fills", ["==", "name", ""]);
    this.map.getCanvas().style.cursor = '';
  }

  addClickEffects() {
    let neighborhood, bbox;
    // Get bounding box of neighborhood clicked, compile stats on that neighborhood,
    // and then center map over it
    this.map.on("click", "neighborhoods", e => {
      neighborhood = e.features[0].properties.name;
      bbox = getBbox(this.props.neighborhoods[neighborhood]);
      this.map.fitBounds(bbox, { padding: 10 });
      this.getStats(neighborhood);
    });
  }

  getRoadEdgesAsGeoJSON(roadEdges, intersections) {
    return roadEdges.map(edge => {
      let geoJSON = {};
      geoJSON['type'] = 'Feature';
      geoJSON['geometry'] = {
        'type': 'LineString',
        'coordinates': this.getIntersectionsFromRoadEdge(edge, intersections)
      };
      return geoJSON;
    });
  }

  getIntersectionsFromRoadEdge(edge, intersections) {
    return [
      intersections[edge['intersection1_id']]['geometry']['coordinates'],
      intersections[edge['intersection2_id']]['geometry']['coordinates']
    ];
  }

  getStats(neighborhood) {
    let stats, statsMemo;
    stats = this.state.statsMemo[neighborhood];
    if (!stats) {
      stats = countCrimes(
        this.props.crimes,
        this.props.neighborhoods[neighborhood],
        neighborhood,
        this.memoizeStats,
        this.updateStatsDisplayed
      );
    } else {
      this.updateStatsDisplayed(neighborhood, stats);
    }
  }

  memoizeStats(neighborhood, stats) {
    // memoize the stats for this neighborhood for rapid retrieval next time it is clicked
    let statsMemo = this.state.statsMemo;
    statsMemo[neighborhood] = stats;
    this.setState({ statsMemo });
  }

  updateStatsDisplayed(neighborhood, stats) {
    this.setState({
      statsDisplayed: { neighborhood, stats }
    });
  }

  addLayer(layer) {
    // second argument to addLayer is a layer on the map beneath which to insert the new layer
    // this ensures that our custom layers don't cover up street names and map labels
    let beneathLayer = this.map.getStyle().layers[110].id;
    this.map.addLayer(layer, beneathLayer);
  }

  handleToggle(layer) {
    let el = document.getElementById(layer);
    if (el.className === 'active') {
      el.className = '';
    } else {
      el.className = 'active';
    }

    if (layer === 'neighborhoods') {
      this.toggleNeighborhoods();
    } else {
      this.toggleLayerVisibility(layer);
    }
  }

  toggleNeighborhoods() {
    let overlay = document.getElementById('map-overlay');

    this.toggleLayerVisibility('neighborhoods');
    this.toggleLayerVisibility('neighborhood-outlines');
    this.toggleLayerVisibility('neighborhood-fills');

    if (this.state.hoverEffects) {
      this.removeHoverEffects();
      if (overlay) { overlay.style.display = 'none'; }
    } else {
      this.addHoverEffects();
      if (overlay) { overlay.style.display = 'block'; }
    }
    this.setState({ hoverEffects: !this.state.hoverEffects });
  }

  toggleLayerVisibility(layerId) {
    let visibility = this.map.getLayoutProperty(layerId, 'visibility');
    if (visibility === 'visible') {
      this.map.setLayoutProperty(layerId, 'visibility', 'none');
    } else {
      this.map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
  }

  render() {
    const toggleableLayers = (
      <ul className="legend">
        <li
          id="intersections"
          className="active"
          onClick={ () => this.handleToggle('intersections') }>Intersections
        </li>
        <li
          id="road-edges"
          className="active"
          onClick={ () => this.handleToggle('road-edges') }>Connected Intersections
        </li>
      </ul>
    );

    let statsDisplayed = this.state.statsDisplayed;
    const overlay = mapOverlay(statsDisplayed.neighborhood, statsDisplayed.stats);

    return (
      <div>
        { toggleableLayers }
        { overlay }
      </div>
    );
  }
}

export default DataMap;
