
// PRE-LOADER
$(window).on('load', function () {
    if ($('#loader').length) {
        $('#loader').delay(1000).fadeOut('slow', function () {
            $(this).hide();
        });
        $('#loader').css('background-color', '#ffffff29');
    }
});

//--------------------- LEAFLET initilisation--------------------------

//initialise variables
let map;
let geojson;
let selectedCountry;
let cityLayer;
let poiLayer;
let poiBounds;

const handlePOSTError = () => {
    $('#loader').hide();
    if (selectedCountry) {
        handleSelectCountry(selectedCountry);
    }
}

//tile layers

const streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
  }
);

const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
  }
);

const baselayers = {
  "Streets": streets,
  "Satellite": satellite
};

map = L.map('map', {
    layers: [streets]
}).fitWorld();

//Layer selection control

layerControl = L.control.layers(baselayers, null, { position: 'topleft' }).addTo(map);


//-----------------modal buttons------------------------------

var infoBtn = L.easyButton("fa-info fa-xl", function (btn, map) {
    $("#exampleModal").modal("show");
  });


infoBtn.addTo(map);

//-----------------MAP STYLES---------------------------------

const defaultCountryStyle = (feature) => {
    return {
        fillColor: '#313B72',
        weight: 2,
        opacity: 1,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.7
    }
};

const highlightedCountryStyle = {
    fillColor: '#809848',
    weight: 3,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
};

const selectedCountryStyle = {
    fillColor: '#447604',
    weight: 5,
    color: '#48245e',
    dashArray: '',
    fillOpacity: 0.7
};

//-----------------Country Selection Handler------------------

const handleSelectCountry = async (layer) => {
    $('#loader').show();
    //Set current target
    selectedCountry = layer;

    //Deselect current selected country
    geojson.eachLayer((l) => {
        if (l.isSelected) {
            geojson.resetStyle(l);
            l.isSelected = false;
        }
    });
    //remove any city and poi layers
    $('#go-back').hide();

    if (cityLayer) {
        cityLayer.removeFrom(map);
    }

    if (poiLayer) {
        poiLayer.removeFrom(map);
    }

    layer.isSelected = true;
    //zoom to country
    map.fitBounds(layer.getBounds());

    //highlight the new country
    layer.setStyle(selectedCountryStyle);
    layer.bringToFront;

    //update dropdown if needed
    const { name } = selectedCountry.feature.properties;
    if ($('#country-list').val() !== name) {
        $('#country-list').val(name);
    }

    //Update country info
    //ADD LOADING SCREEN FOR DATA PANE
    const props = await getProps(layer)
        .then((props) => countryInfo.update(props));
    
    //adding cities
    const cities = await getCities(layer)
        .then((cities) => cityLayer = L.layerGroup(cities))
        .then(() => cityLayer.addTo(map))
        .then(() => $('#loader').hide());
};

//-----------------INFO PANE-----------------------------------------------

//initilise country info pane controls
const countryInfo = L.control();

countryInfo.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'country-info');
    return this._div;
};

//Method for updating info pane
countryInfo.update = function (props) {
    const { iso_a2,
            continent,    
            capital,
            area,
            population
    } = props;

    this._div.innerHTML = '<div id="country-info-id"><img src=https://flagsapi.com/' + iso_a2 + '/shiny/64.png>'
        + '<h4>' + iso_a2 + '</h4></div><br>'
        + '<div class="extra-info"><p><b>Continent:</b> ' + continent + '</p>'
        + '<p><b>Capital:</b> ' + capital + '</p>'
        + '<p><b>Area:</b> ' + area + ' km&sup2;</p>'
        + '<p><b>Population:</b> ' + population + '</p></div>';
};

//get properties for info pane
const getProps = async (layer) => {
    //ajax for country info
    await $.ajax({
        url: "./libs/php/country-info.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layer.feature.properties.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                layer.feature.properties.continent = result.data.continentName;
                layer.feature.properties.capital = result.data.capital;
                layer.feature.properties.area = result.data.areaInSqKm;
                layer.feature.properties.population = result.data.population;
            } else {
                console.log('error');
            }
        
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });

    return layer.feature.properties;
}

//toggle detailed info
const toggleInfo = () => {
    $('.extra-info').toggle();
}

//add info pane
countryInfo.addTo(map);

//------------CITY LAYER-------------------------------------------------------

//Get city info
const getCities = async (layer) => {
    let cityArr = [];
    await $.ajax({
        url: "./libs/php/cities.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layer.feature.properties.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                cityArr = [];
                result.data.data.forEach((city) => {
                    cityArr.push(L.marker([city.latitude, city.longitude]).bindPopup(
                        '<h5>' + city.name + '</h5>'
                        + '<button class="btn" type="button" id="poi-button" latitude="' + city.latitude + '"' + 'longitude="' + city.longitude + '"' + 'country="' + city.countryCode + '">See nearby POIs</button>'
                    ));
                });

            } else {
                console.log('error');
            }
        
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
    return cityArr;
};

//----------------------POIS------------------------------------------

//Get POI info

const getPois = async (latitude, longitude, country) => {
    let poiArr = [];
    await $.ajax({
        url: "./libs/php/pois.php",
        type: 'POST',
        dataType: 'json',
        data: {
            latitude: latitude,
            longitude: longitude,
            country: country
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                poiArr = [];
                poiBounds = [];
                result.data.forEach((poi) => {
                    poiArr.push(L.marker([poi.lat, poi.lng]).bindPopup(
                        '<h5>' + poi.title + '</h5>'
                        + '<a href="http://' + poi.wikipediaUrl + '" target="_blank" class="popup">Click here for wiki page</a>'
                    ));
                    poiBounds.push([poi.lat, poi.lng]);
                });
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
    return poiArr;
}

//show nearby POIs once city is selected

const handleShowPois = async (latitude, longitude, country) => {
    $('#loader').show();
    //remove other cities + pois from map
    if (poiLayer) {
        poiLayer.removeFrom(map);
    }
    cityLayer.removeFrom(map);
    //Show back button
    $('#go-back').show();
    //adding pois
    const pois = await getPois(latitude, longitude, country)
        .then((pois) => poiLayer = L.layerGroup(pois))
        .then(() => map.flyToBounds(poiBounds, { duration: 1 }))
        .then(() => poiLayer.addTo(map))
        .then(() => $('#loader').hide());
}

//------------------EVENT LISTENERS-----------------------------------------

//Selecting a country with the select dropdown box
$('#country-list').on('change', (e) => {
    let layer;
    geojson.eachLayer((l) => {
        if (l.countryName === e.target.value) {
            layer = l;
        }
    });
    handleSelectCountry(layer);
});

//Selecting a country by clicking on the map
const selectFeature = (e) => {
    const layer = e.target;
    handleSelectCountry(layer);
};

//Highting a country on mouseover
const highlightFeature = (e) => {
    const layer = e.target;
    if (!layer.isSelected) {
        layer.setStyle(highlightedCountryStyle);
        layer.bringToFront();
    }
};

//Removing country highlight on mouseleave
const resetHighlight = (e) => {
    const layer = e.target;
    if (!layer.isSelected) {
        geojson.resetStyle(layer);
    }
}

//Showing nearby POIs when clicking on the button
$('#map').on('click', '#poi-button', (e) => {
    const latitude = e.currentTarget.getAttribute('latitude');
    const longitude = e.currentTarget.getAttribute('longitude');
    const country = e.currentTarget.getAttribute('country');
    handleShowPois(latitude, longitude, country);
});

//clicking on the back button after searching POIs
$('#go-back').on('click', () => {
    handleSelectCountry(selectedCountry);
});

//Toggle detailed info by clicking on the info pane.
$('#map').on('click', '.country-info', () => {
    toggleInfo();
    $('.country-info').css({
        'background-color' : '#462255',
        'color' : 'white'
    });
});

//mouseover styling
$('#map').on('mouseover', '.country-info', () => {
    $('.country-info').css({
        'background-color': '#7094cf',
        'color' : '#242526'
    });
});
$('#map').on('mouseleave', '.country-info', () => {
    $('.country-info').css({
        'background-color' : '#462255',
        'color' : 'white'
    });
});

//tie functions to listeners
const onEachFeature = (feature, layer) => {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature
    });
    //add name to top level object for dropdown accessibility
    layer.countryName = layer.feature.properties.name;
}

//-----------------POPULATING MAP ON LOAD----------------------------------------

//Adding GeoJSON borders, populating country list

$.ajax({
    url: "./libs/php/geojson-borders.php",
    type: 'POST',
    dataType: 'json',
    data: {},
    success: function(result) {

        console.log(JSON.stringify(result));
        
        if (result.status.name == "ok") {
            const mapData = result.data;
            //add borders
            geojson = L.geoJson(mapData, {
                style: defaultCountryStyle,
                onEachFeature: onEachFeature
            }).addTo(map);

            //Find initial location
            map.locate();

            //Found
            const onLocationFound = (e) => {
                let country;
                const coordinates = [e.latitude, e.longitude];
                geojson.eachLayer((l) => {
                    const boundsToCheck = l.getBounds();
                    if (boundsToCheck.contains(coordinates)) {
                        if (!country) {
                            country = l;
                        } else {
                            return;
                        }
                    }
                });
                handleSelectCountry(country);
            }
            map.on('locationfound', onLocationFound);
            //Not Found
            const onLocationError = () => {
                map.setZoom(2);
                console.log('Location not found');
            }
            map.on('locationerror', onLocationError);

        } else {
            console.log('error');
        }
    
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log('POST request not fulfilled');
        handlePOSTError();
    }
});

//populating country list

$.ajax({
    url: "./libs/php/country-list.php",
    type: 'POST',
    dataType: 'json',
    data: {},
    success: function(result) {

        console.log(JSON.stringify(result));
        
        if (result.status.name == "ok") {
            countryArr = result.data;
            countryArr.forEach((country) => {
                $('#country-list').append('<option value=\"' + country + '\">' + country + '</option>');
            });

        } else {
            console.log('error');
        }
    
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log('POST request not fulfilled');
        handlePOSTError();
    }
});
