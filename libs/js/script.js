
// PRE-LOADER
$(window).on('load', function () {
    if ($('#preloader').length) {
        $('#preloader').delay(1000).fadeOut('slow', function () {
            $(this).remove();
        });
    }
});

// LEAFLET and map functionality

//initialise map and variables
const map = L.map('map').fitWorld();
let geojson;
let selectedCountry;
let cityLayer;

//Add tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


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

    this._div.innerHTML = '<img src=https://flagsapi.com/' + iso_a2 + '/shiny/64.png>'
        + '<h4>' + iso_a2 + '</h4><br>'
        + '<p>Continent: ' + continent + '</p>'
        + '<p>Capital: ' + capital + '</p>'
        + '<p>Area: ' + area + ' km&sup2;</p>'
        + '<p>Population: ' + population + '</p>';
};

//get properties for info pane
const getProps = async (layer) => {
    //ajax for country info
    await $.ajax({
        url: "./libs/php/capitals.php",
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
        }
    });

    return layer.feature.properties;
}

//add info pane
countryInfo.addTo(map);

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
                    cityArr.push(L.marker([city.latitude, city.longitude]).bindPopup(city.name));
                })
            } else {
                console.log('error');
            }
        
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
        }
    });
    return cityArr;
};


/*
//Find location
map.locate({setView: true, maxZoom: 16});

//Found
const onLocationFound = (e) => {
    const radius = e.accuracy;

    L.marker(e.latlng).addTo(map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

//Not Found
const onLocationError = (e) => {
    alert(e.message);
}

map.on('locationerror', onLocationError);
*/


//Main style for GeoJSON borders

const borderStyle = (feature) => {
    return {
        fillColor: '#f7fcb9',
        weight: 2,
        opacity: 1,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.7
    }
};

//Event Listeners

//Selecting a country with the select box
$('#country-list').on('change', (e) => {
    let layer;
    map.eachLayer((l) => {
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

//Country Selection Handler
const handleSelectCountry = async (layer) => {
    //Set current target
    selectedCountry = layer;

    //Deselect current selected country
    map.eachLayer((l) => {
        if (l.isSelected) {
            geojson.resetStyle(l);
            l.isSelected = false;
        }
    });

    if (cityLayer) {
        cityLayer.removeFrom(map);
    }

    layer.isSelected = true;
    //zoom to country
    map.fitBounds(layer.getBounds());

    //highlight the new country
    layer.setStyle({
        fillColor: '#31a354',
        weight: 5,
        color: '#636363',
        dashArray: '',
        fillOpacity: 0.7
    });

    //update dropdown if needed
    const { name, iso_2 } = selectedCountry.feature.properties;
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
        .then(() => cityLayer.addTo(map));
};

//Highting a country on mouseover
const highlightFeature = (e) => {
    const layer = e.target;
    if (!layer.isSelected) {
        layer.setStyle({
            fillColor: '#addd8e',
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
    
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



//Adding GeoJSON borders, populating country list

$.ajax({
    url: "./libs/php/countries.php",
    type: 'POST',
    dataType: 'json',
    data: {},
    success: function(result) {

        console.log(JSON.stringify(result));
        
        if (result.status.name == "ok") {
            const mapData = result.data;
            //add borders
            geojson = L.geoJson(mapData, {
                style: borderStyle,
                onEachFeature: onEachFeature
            }).addTo(map);

            //populate country list
            const countryList = mapData.features;
            countryList.forEach((country) => {
                $('#country-list').append('<option value=\"' + country.properties.name + '\">' + country.properties.name + '</option>');
            });

            //select first country
            let firstLayer;
            map.eachLayer((l) => {
                if (l.countryName === 'United Kingdom') {
                    firstLayer = l;
                }
            });

            //select initial country
            handleSelectCountry(firstLayer);

        } else {
            console.log('error');
        }
    
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log('POST request not fulfilled');
    }
});
