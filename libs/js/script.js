
// PRE-LOADER
$(window).on('load', function () {
    if ($('#loader').length) {
        $('#loader').delay(1000).fadeOut('slow', function () {
            $(this).hide();
        });
    }
});

//--------------------- LEAFLET initilisation--------------------------

//initialise variables
let map;
let geojson;
let selectedCountry;
let cityMarkers = L.markerClusterGroup();
let airportMarkers = L.markerClusterGroup();

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
const baseLayers = {
    "Streets": streets,
    "Satellite": satellite
  };

//Global functions

const handlePOSTError = () => {
    $('#loader').hide();
}

//initialise map

map = L.map('map', {
    layers: [streets]
}).fitWorld();

//add layer controls
layerControl = L.control.layers(baseLayers, null, { position: 'topleft' }).addTo(map);
layerControl.addOverlay(cityMarkers, 'Cities');
layerControl.addOverlay(airportMarkers, 'Airports');

//-----------------modal buttons------------------------------

const newsBtn = L.easyButton("fa-solid fa-newspaper fa-xl", (btn, map) => {
    getNews();
    $("#news-modal").modal("show");
  });


newsBtn.addTo(map);

const weatherBtn = L.easyButton("fa-solid fa-cloud-sun-rain fa-xl", (btn, map) => {
    $("#weather-modal").modal("show");
  });


weatherBtn.addTo(map);

const currencyBtn = L.easyButton("fa-solid fa-coins fa-xl", (btn, map) => {
    $("#currency-modal").modal("show");
  });


currencyBtn.addTo(map);


const wikiBtn = L.easyButton("fa-solid fa-w fa-xl", (btn, map) => {
    getWiki(selectedCountry);
    $("#wiki-modal").modal("show");
  });


wikiBtn.addTo(map);

const attributionsBtn = L.easyButton("fa-solid fa-copyright fa-xl", (btn, map) => {
    $("#attributions-modal").modal("show");
  });

attributionsBtn.addTo(map);

//Icons for markers

const cityIcon = L.divIcon({
    html: '<i class="fa-solid fa-city fa-2xl"></i>',
    iconSize: [32, 32],
    className: 'city-icon'
});

const cityIconCapital = L.divIcon({
    html: '<i class="fa-solid fa-star fa-2xl"></i>',
    iconSize: [32, 32],
    className: 'city-icon-capital'
});

const airportIcon = L.divIcon({
    html: '<i class="fa-solid fa-plane fa-2xl"></i>',
    iconSize: [32, 32],
    className: 'airport-icon'
});

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

    //clear marker layers
    cityMarkers.clearLayers();
    airportMarkers.clearLayers();

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
    const props = await getProps(layer)
        .then((props) => countryInfo.update(props))
        .then(() => $('#loader').hide());
    
    //adding cities
    const cities = await getCities(layer)
        .then((cities) => cityMarkers.addLayers(cities));

    /*
    //adding airports
    const airports = await getAirports(layer)
    .then((airports) => airportMarkers.addLayers(airports));
    //.then(() => layerControl.addOverlay(airportMarkers, 'Airports'));
    */
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

//Ajax calls-------------

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
                let checkingArr = [];
                result.data.forEach((city) => {
                    if (!checkingArr.includes(city.name)) {
                        if (city.name === layer.feature.properties.capital) {
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIconCapital}).bindPopup('<i class="fa-regular fa-star"></i><h5>' + city.name + '</h5>'));
                        } else {
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIcon}).bindPopup('<h5>' + city.name + '</h5>'));
                        }
                        checkingArr.push(city.name);
                    }
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


const getAirports = async (layer) => {
    let airportArr = [];
    await $.ajax({
        url: "./libs/php/airports.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layer.feature.properties.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                airportArr = [];
                result.data.forEach((airport) => {
                    airportArr.push(L.marker([airport.latitude, airport.longitude], {icon: airportIcon}).bindPopup('<h5>' + airport.name + '</h5>'));
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
    return airportArr;
}

//Getting wikipedia info

const formatCountry = (country) => {
    let formattedCountry;
    if (country.includes("d'Ivoire")) {
        formattedCountry = 'Ivory%20Coast';
    } else if (country === 'Dem. Rep. Korea') {
        formattedCountry = 'North%20Korea';
    } else if (country === 'Lao PDR') {
        formattedCountry = 'Laos';
    } else if (country === 'Guinea-Bissau') {
        formattedCountry = 'Guinea%20Bissau';
    } else if (country === 'Timor-Leste') {
        formattedCountry = 'East%20Timor';
    } else {
        formattedCountry = country
            .replaceAll(' ', '%20')
            .replace('Dem.', 'Democratic')
            .replace('Rep.', 'Republic')
            .replace('W.', 'Western')
            .replace('Is.', 'Islands')
            .replace('Herz.', 'Herzegovina')
            .replace('N.', 'Northern')
            .replace('Eq.', 'Equatorial')
            .replace('S.', 'South');

    }
    return formattedCountry;
}

const getWiki = (layer) => {
    $('#wiki-title').html('Loading');
    $('#wiki-summary').html('');
    $('#wiki-link').attr('href', 'https://www.wikipedia.org/');
    const countryRequest = layer.feature.properties.name;
    const formattedCountry = formatCountry(countryRequest);
    $.ajax({
        url: "./libs/php/wikipedia.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: formattedCountry
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                const wikiEntry = result.data;
                $('#wiki-title').html(wikiEntry.title);
                $('#wiki-summary').html(wikiEntry.summary);
                $('#wiki-link').attr('href', 'http://' + wikiEntry.wikipediaUrl);
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            $('#wiki-title').html('Entry not found');
            $('#wiki-summary').html('Please go to <a href="https://www.wikipedia.org/">https://www.wikipedia.org/</a> and search manually.');
            $('#wiki-link').attr('href', 'https://www.wikipedia.org/');
            handlePOSTError();
        }
    });
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
                $('#loader').css('background', '#ffffff40');
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
