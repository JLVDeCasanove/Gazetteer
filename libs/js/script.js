
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
let currentTarget;

//Add tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


//initilise country info controls
const countryInfo = L.control();

countryInfo.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'country-info');
    this.update();
    return this._div;
};

//Get country info function
const getCountryInfo = () => {
    let props = {};
    //ajax for flag
    //name
    props.name = currentTarget;
    //ajax for capital
    //ajax for currency
    //ajax for current weather
    //ajax for wiki links





}

//Method for updating info
countryInfo.update = function (props) {
    this._div.innerHTML = '<h4>' + currentTarget + '</h4><br>' + '<p>' + props + '</p>';
};

countryInfo.addTo(map);



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
    const layer = e.target.value;
    console.log(layer);
    handleSelectCountry(layer);
});

//Selecting a country by clicking on the map
const selectFeature = (e) => {
    const layer = e.target;
    handleSelectCountry(layer);
};

//Country Selection Handler
const handleSelectCountry = (layer) => {
    console.log(layer);
    //Get the name
    currentTarget = layer.feature.properties.name;
    //Update country info
    countryInfo.update(layer.feature.properties);
    //Deselect current selected country
    map.eachLayer((l) => {
        if (l.isSelected) {
            geojson.resetStyle(l);
            l.isSelected = false;
        }
    });
    //select the new country
    layer.setStyle({
        fillColor: '#31a354',
        weight: 5,
        color: '#636363',
        dashArray: '',
        fillOpacity: 0.7
    });
    //zoom to country
    map.fitBounds(layer.getBounds());
    layer.isSelected = true;
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
}

//Adding GeoJSON borders and populating country list

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
                $('#country-list').append('<option value=\"' + country.properties + '\">' + country.properties.name + '</option>');
            });


        } else {
            console.log('error');
        }
    
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log('POST request not fulfilled');
    }
});
