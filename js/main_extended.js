

//Deine variables for the basemap options
var lyrOSM;
var lyrDrk;

//Define a variable for creating toggle options layers box
var ctlLayers;
var objBasemaps;



//Create a new variable named map, which div to go to

$(document).ready(function() {
  var ports; 
  var map = L.map('map', {
    center: [30,-5],
    zoom: 2, 
    minZoom: 0,
    maxZoom: 20
  });


  //Wrap the basemaps in a function that helps alliviate the 1px lines appearing between tiles
  (function(){
    var originalInitTile = L.GridLayer.prototype._initTile
    L.GridLayer.include({
        _initTile: function (tile) {
            originalInitTile.call(this, tile);

            var tileSize = this.getTileSize();

            tile.style.width = tileSize.x + 1 + 'px';
            tile.style.height = tileSize.y + 1 + 'px';
        }
    });
})(
//Decalare the three basemaps using providers
lyrOSM = L.tileLayer.provider('OpenStreetMap.Mapnik'),
lyrImagery = L.tileLayer.provider('USGS.USImagery'),
lyrSmoothDark = L.tileLayer.provider('Stadia.AlidadeSmoothDark'),
//lyrDrkNight = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012') ,//Looked Cool but the service layer creidts was too much text
map.addLayer(lyrOSM))



objBasemaps = {
  "OSM": lyrOSM,
  //"Night Sky" : lyrDrkNight,//Looked Cool but the service layer creidts was too much text
  "Smooth Dark" : lyrSmoothDark,
  "Aerial Imagery": lyrImagery
};


//Load data with fail message
lyrTopPorts = $.getJSON("data/TopPorts.geojson").done(function(data){
  var info = processData(data);
  //Call each eventual function used in the system
  createPropSymbols(info.timestamps, data);
  createLegend(info.min,info.max)
  CreateSliderUI(info.timestamps)
})
.fail(function() { alert("Invalid Data")})

//Create object holding the layer variable previously created


//Pass the basemap variables to a new variable to add to the map / create basemap option box
ctlLayers = L.control.layers(objBasemaps).addTo(map);

//process the data in order to isolate the numeric values in the timelapse
function processData(data) {
  var timestamps= [];
  var min = Infinity;
  var max = -Infinity; 
  
  for (var feature in data.features) {
    var properties = data.features[feature].properties;

    for (var attribute in properties) {
      if (attribute != 'id'&&
      attribute != 'name' &&
      attribute != 'latitude' && 
      attribute != 'longitude' &&
      attribute != 'QUARTER') {
        if ( $.inArray(attribute,timestamps) === -1) {
          timestamps.push(attribute);
        }
        if (properties[attribute] < min) {
          min = properties[attribute];
        }
        if (properties[attribute] > max) {
          max = properties[attribute];
        }
      }
    }
  }
  return {
    timestamps:timestamps,
    min:min,
    max:max
  }
}



//Create proportional symbols by making them circles and link them to the timestamps
function createPropSymbols(timestamps,data) {
  ports = L.geoJson(data, {
    pointToLayer: function(feature,latlng) {
      return L.circleMarker(latlng, {
        fillColor: "#54110b",
        color: '#e62615',
        weight: 1, 
        fillOpacity: 0.6
      })
    }
  }).addTo(map);
  updatePropSymbols(timestamps[0]);
}



/////Create a function that creates proportional symbols tied to the timelapse (fields with numeric values)
//Create a bind popup to go with the calculated radius
function updatePropSymbols(timestamps) {
  ports.eachLayer(function(layer) {
    var props = layer.feature.properties;
    var radius = calcPropRadius(props[timestamps]);
    var popupContent = timestamps +":" +"<p></p>" + "<b>" + Math.trunc(String(props[timestamps])) +
                      " LSCI</b><br>" + 
                      "<i>" + props.QUARTER;
    layer.setRadius(radius);
    layer.bindPopup(popupContent, { offset: new L.Point(0,-radius)});
  });
}

//calculate the radius of the circles on the map
function calcPropRadius(attributeValue) {
  var scaleFactor = 16; 
  var area = attributeValue * scaleFactor;
  return Math.sqrt(area/Math.PI)*.95;
}

function createLegend(min,max) {
  if (min<10) {
      min = 10;
  }
//Create a Legend on with in-line CSS to place on the map div
  function roundNumber(inNumber) {
      return (Math.round(inNumber/10) * 10);
  }
  var legend = L.control( { position: 'bottomright'});
  legend.onAdd = function(map) {
      var legendContainer = L.DomUtil.create("div", "legend");
      var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
      var classes = [roundNumber(min), roundNumber((max-min)/2), roundNumber(max)];
      var legendCircle;
      var lastRadius = 0;
      var currentRadius;
      var margin; 

      L.DomEvent.addListener(legendContainer, 'mousedown', function(e) {
          L.DomEvent.stopPropagation(e);
      });
      $(legendContainer).append("<h2 id='legendTitle'>LSCI Value</h2>");

      for (var i = 0; i <= classes.length-1; i++) {
          legendCircle = L.DomUtil.create("div", "legendCircle");
          currentRadius = calcPropRadius(classes[i]);
          margin = -currentRadius - lastRadius -2; 

      $(legendCircle).attr("style","width: " + currentRadius*2 + 
          "px: height: " + currentRadius*2 +
          "px: margin-left: " + margin + "px");
      $(legendCircle).append("<span class= 'legendValue'>"+classes[i]+"</span>")
      
      
      $(symbolsContainer).append(legendCircle);

      lastRadius = currentRadius;

      }

      $(legendContainer).append(symbolsContainer);
      return legendContainer;
  };
  legend.addTo(map);
}

//A function to create a slider widget with listener control
function CreateSliderUI(timestamps) {
  var sliderControl = L.control({position: 'bottomleft'});
  sliderControl.onAdd = function(map) {
      var slider = L.DomUtil.create("input","range-slider");
      L.DomEvent.addListener(slider, 'mousedown', function(e) {
          L.DomEvent.stopPropagation(e);
      });
      $(slider)
          .attr({'type' : 'range',
              'max':timestamps[timestamps.length-1],
              'min':timestamps[0],
              'step':1,
              'value': String(timestamps[0])})
          .on('input change', function() {
          updatePropSymbols($(this).val().toString());
              $(".temporal-legend").text(this.value);
      });
      return slider;
  }
  sliderControl.addTo(map)
  createTemporalLegend(timestamps[0]);
}
//Place the slider on the map and tie it with the timestamp values
function createTemporalLegend(startTimestamp) {
  var temporalLegend = L.control({position: 'bottomleft'});

  temporalLegend.onAdd = function(map) {
      var output = L.DomUtil.create("output", "temporal-legend");
      $(output).text(startTimestamp)
      return output;
  }
  temporalLegend.addTo(map);
}


})

//////////////////////////////////////////////End of $(ready).function()

