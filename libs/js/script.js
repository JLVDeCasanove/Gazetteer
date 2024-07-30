
//////////////////////////////////////////////////////////////////////////////
// ---PRE-LOADER--- /////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

$(window).on('load', function () {
    if ($('#loader').length) {
        $('#loader').delay(1000).fadeOut('slow', function () {
            $(this).hide();
        });
    }
});


/////////////////////////////////////////////////////////////////////////////
// ---GLOBAL VARIABLE DECLARATIONS --- /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//vars
let map;
let geojson;
let selectedCountry; //tracks currently selected country
let initialCountry; //tracks country selected on page load
let randomCountry; //stores a random country for when location not found
let cityMarkers = L.markerClusterGroup();
let airportMarkers = L.markerClusterGroup();

//for timezone feature
let selectedTimezone;
//for time feature
let timerInterval;
//for currency feaature
let currencyListPopulated = false;

//functions
const handlePOSTError = () => {
    $('#loader').hide();
}


/////////////////////////////////////////////////////////////////////////////
// ---LEAFLET SETUP --- ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Map tile layers
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

//Map Styles
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

//Icons for map markers
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

//add layer controls
layerControl = L.control.layers(baseLayers, null, { position: 'topleft' });
layerControl.addOverlay(cityMarkers, 'Cities');
layerControl.addOverlay(airportMarkers, 'Airports');

//Attributions modal
const attributionsBtn = L.easyButton("fa-solid fa-copyright fa-xl", (btn, map) => {
    $("#attributions-modal").modal("show");
  });

//Country Selection Handler
const handleSelectCountry = async (layer) => {
    //make loader transparent to show map but disable input while country info loads
    $('#loader').css('background', '#ffffff25');
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

    //zoom to country
    map.fitBounds(layer.getBounds());

    //highlight the new country
    layer.setStyle(selectedCountryStyle);
    layer.bringToFront;
    //Tracking for reset style above
    layer.isSelected = true;

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
*/

};

/////////////////////////////////////////////////////////////////////////////
// ---EVENT LISTENERS --- //////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Selecting a country with the select dropdown box
$('#country-list').on('change', (e) => {
    let layer;
    geojson.eachLayer((l) => {
        if (l.feature.properties.name === e.target.value) {
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

//tie functions to listeners
const onEachFeature = (feature, layer) => {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature
    });
}


/////////////////////////////////////////////////////////////////////////////
// ---COUNTRY INFO FEATURE --- /////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Initilising custom control feature
const countryInfo = L.control();

countryInfo.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'country-info');
    return this._div;
};

//Method for updating
countryInfo.update = function (props) {
    const { iso_a2,
            continent,    
            capital,
            area,
            population
    } = props;

    //dynamic element creation
    this._div.innerHTML = '<div id="country-info-id"><img src=https://flagsapi.com/' + iso_a2 + '/shiny/64.png>'
        + '<h4>' + iso_a2 + '</h4></div><br>'
        + '<div class="extra-info"><p><b>Continent:</b> ' + continent + '</p>'
        + '<p><b>Capital:</b> ' + capital + '</p>'
        + '<p><b>Area:</b> ' + area + ' km&sup2;</p>'
        + '<p><b>Population:</b> ' + population + '</p></div>';
    
    $('.country-info').show();
};

//Ajax call for country info
const getProps = async (layer) => {
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
                //fixes specific case which shows incorrect capital for Kazakstan
                if (layer.feature.properties.iso_a2 === 'KZ') {
                    layer.feature.properties.capital = 'Astana';
                } else {
                    layer.feature.properties.capital = result.data.capital;
                }
                layer.feature.properties.area = Number(result.data.areaInSqKm).toLocaleString();
                layer.feature.properties.population = Number(result.data.population).toLocaleString();
                //adds currency code for currency feature
                layer.feature.properties.currencyCode = result.data.currencyCode;
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('.country-info').hide();
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
    return layer.feature.properties;
}

//Toggle detailed info by clicking on the info box
$('#map').on('click', '.country-info', () => {
    $('.extra-info').toggle();
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


/////////////////////////////////////////////////////////////////////////////
// ---MAP MARKERS FEATURE --- //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//------------CITY LAYER------------//

//Get city info and store in marker groups
const getCities = async (layer) => {
    let cityArr = [];
    const layerData = layer.feature.properties;
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
                    //checking array to avoid duplicates from API call
                    if (!checkingArr.includes(city.name)) {
                        //check info stored by country info feature to identify capital and give different marker
                        //Additional cases where API calls were mismatched
                        if (city.name === layerData.capital || city.name === 'Reykjavík' || city.name === 'Delhi'|| city.name === 'City of Brussels'|| city.name === 'Naypyidaw') {
                            //Store capital lat and lng data for weather feature
                            layerData.capitalLat = city.latitude;
                            layerData.capitalLng = city.longitude;
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIconCapital}).bindPopup('<i class="fa-regular fa-star"></i><h5>' + city.name + '</h5>'));
                        } else {
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIcon}).bindPopup('<h5>' + city.name + '</h5>'));
                        }
                        checkingArr.push(city.name);
                    }
                });
                //Manually add Washington for US as API call was unable to retrieve without sub-optimal params
                if (layerData.iso_a2 === 'US') {
                    cityArr.push(L.marker([38.89511, -77.03637], {icon: cityIconCapital}).bindPopup('<i class="fa-regular fa-star"></i><h5>Washington</h5>'));
                    layerData.capitalLat = 38.89511;
                    layerData.capitalLng = -77.03637;
                }
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

//------------AIRPORTS LAYER---------//

//Get airport info and store in marker groups
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


/////////////////////////////////////////////////////////////////////////////
// ---NEWS FEATURE --- /////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Button and modal handler
const newsBtn = L.easyButton("fa-solid fa-newspaper fa-xl", (btn, map) => {
    getNews(selectedCountry);
    $("#news-modal").modal("show");
  });

//Ajax call and modal population
const getNews = (layer) => {
    $('news-body').html('<p>Loading Local News...</p>');
    $.ajax({
        url: "./libs/php/news.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layer.feature.properties.iso_a2
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                $('#news-body').html('');
                const articles = result.data.articles;
                if (articles[0]) {
                    articles.forEach((article) => {
                        $('#news-body').append(
                            '<tr><th colspan="2"><a class="news responsive-modal-text" href="'
                            + article.url + '" target="blank"><i class="fa-regular fa-newspaper fa-xl icon-green-custom"></i>  '
                            + article.title + '</a></th></tr>'
                            + '<tr class="table-bottom-border-on"><td class="responsive-modal-text text-center">Source: '
                            + article.source.name + '</td>'
                            + '<td class="responsive-modal-text text-center">Date: '
                            + new Date(article.publishedAt).toDateString() + '</td></tr>'
                        );
                    });
                } else {
                    $('#news-body').html('<tr><th>No Local News Found</th></tr>');
                }
                
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            $('#news-body').html('<tr><th>No Local News Found</th></tr>');
            handlePOSTError();
        }
    });
}

/////////////////////////////////////////////////////////////////////////////
// ---TIME FEATURE --- /////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Button and modal handler
const timeBtn = L.easyButton("fa-solid fa-clock fa-xl", (btn, map) => {
    getTime(selectedCountry);
    $("#time-modal").modal("show");
  });

//Digital clock
const showTime = () => {    
    const timezone = selectedTimezone;
    const currentDate = new Date();
    const invDate = new Date(currentDate.toLocaleString('en-US', {timeZone: timezone}));
    const diff = currentDate.getTime() - invDate.getTime();
    const targetDate = new Date(currentDate.getTime() - diff)
    const hour = targetDate.getHours();
    const min = targetDate.getMinutes();
    const currentTime = `${hour.toString().padStart(2, 0)}:${min.toString().padStart(2, 0)}`;

    $('#time-digital').html(currentTime);
}

//Clear interval on modal close
$('#time-modal').on('hide.bs.modal', () => {
    clearInterval(timerInterval);
});

//Ajax call and modal population
const getTime = (layer) => {
    const layerInfo = layer.feature.properties;
    $('#time-title').html('Loading...');
    $('#clock').html('');
    $('#time-digital').html('');
    $.ajax({
        url: "./libs/php/timezone.php",
        type: 'POST',
        dataType: 'json',
        data: {
            latitude: layerInfo.capitalLat,
            longitude: layerInfo.capitalLng
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                const timezoneInfo = result.data;
                selectedTimezone = timezoneInfo.timezoneId;
                $('#time-title').html(timezoneInfo.timezoneId);
                
                //analog clock
                $(function () {
                    $("#clock").htAnalogClock({
                        fillColor: "#462255",
                        pinColor: "#809848",
                        borderColor: "#13330f",
                        secondHandColor: "#809848",
                        minuteHandColor: "#fff",
                        hourHandColor: "#fff",
                        fontColor: "#fff",
                        fontName: "Tahoma"
                    }, {
                        timezone: timezoneInfo.timezoneId
                    });
                  });
                
                //digital clock
                timerInterval = setInterval(showTime, 1000);
                showTime();
                
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#time-title').html('Timezone not found.');
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
}

/////////////////////////////////////////////////////////////////////////////
// ---WEATHER FEATURE --- //////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Button and modal handler
const weatherBtn = L.easyButton("fa-solid fa-cloud-sun-rain fa-xl", (btn, map) => {
    getWeather(selectedCountry);
    $("#weather-modal").modal("show");
  });

//Ajax call and modal population
const getWeather = (layer) => {
    layerInfo = layer.feature.properties;
    $('#weather-title').html('Loading...')
    $('#weather-temperature').hide();
    $('#weather-condition').hide();
    $('#weather-clouds').hide();
    $('#weather-humidity').hide();
    $('#weather-windspeed').hide();
    $('#weather-station').hide();
    $('#weather-datetime').hide();

    $.ajax({
        url: "./libs/php/weather.php",
        type: 'POST',
        dataType: 'json',
        data: {
            latitude: layerInfo.capitalLat,
            longitude: layerInfo.capitalLng
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            if (result.status.name == "ok") {
                $('#weather-title').html('Weather in ' + layerInfo.capital);

                $('#weather-temperature').html(result['data']['temperature'] + '&degC');
                if (result['data']['weatherCondition'] && result['data']['weatherCondition'] !== 'n/a') {
                    $('#weather-condition').html(result['data']['weatherCondition']);
                } else {
                    $('#weather-condition').html('N/A');
                }
                $('#weather-clouds').html(result['data']['clouds']);
                $('#weather-humidity').html(result['data']['humidity'] + '&#37');
                $('#weather-windspeed').html(result['data']['windSpeed'] + ' knots');
                $('#weather-station').html(result['data']['stationName']);
                $('#weather-datetime').html(new Date(result['data']['datetime']).toLocaleString());
                $('#weather-temperature').show();
                $('#weather-condition').show();
                $('#weather-clouds').show();
                $('#weather-humidity').show();
                $('#weather-windspeed').show();
                $('#weather-station').show();
                $('#weather-datetime').show();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('POST request not fulfilled');
            $('#weather-title').html('No Observation Found')
            $('#weather-temperature').hide();
            $('#weather-condition').hide();
            $('#weather-clouds').hide();
            $('#weather-humidity').hide();
            $('#weather-windspeed').hide();
            $('#weather-station').hide();
            $('#weather-datetime').hide();
            handlePOSTError();
        }
    }); 
}

/////////////////////////////////////////////////////////////////////////////
// ---CURRENCY EXCHANGE FEATURE --- ////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Button and modal handler
const currencyBtn = L.easyButton("fa-solid fa-coins fa-xl", (btn, map) => {
    handleCurrencyButton();
    $("#currency-modal").modal("show");
  });

const handleCurrencyButton = async () => {
    //populate the select lists if empty
    if (!currencyListPopulated) {
        await populateCurrencyList();
    } else {
        $('#currency-from').val(initialCountry.feature.properties.currencyCode);
        $('#currency-to').val(selectedCountry.feature.properties.currencyCode);
    }
    $('#number-from').val(1);
    exFrom = $('#currency-from').val();
    exTo =  $('#currency-to').val();
    //show currency not found if selected country is not in list
    if (!selectedCountry.feature.properties.currencyCode) {
        $('#currency-title').html('Currency code not found');
        $('#number-to').html('');
    //show message if currency codes to and from are equal
    } else if (exFrom === exTo) {
        $('#currency-title').html('Please select 2 different currencies to convert');
        $('#number-to').html('');
    } else {
        //call ajax and update values
        getExchangeRate(exFrom, exTo, $('#number-from').val());
    }
}

//Ajax call for currency list population
const populateCurrencyList = async () => {
    await $.ajax({
        url: "./libs/php/currency-list.php",
        type: 'POST',
        dataType: 'json',
        data: {},
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                const currencyArr = result.data;
                currencyArr.forEach((cCode) => {
                    $('#currency-from').append('<option>' + cCode + '</option>');
                    $('#currency-to').append('<option>' + cCode + '</option>');
                })
                currencyListPopulated = true;
                $('#currency-from').val(initialCountry.feature.properties.currencyCode);
                $('#currency-to').val(selectedCountry.feature.properties.currencyCode);
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#currency-title').html('Currency code Not found...');
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
}

//Ajax call and modal population
const getExchangeRate = (exFrom, exTo, amount) => {
    $('#currency-title').html('Loading...');
    $.ajax({
        url: "./libs/php/currency-exchange.php",
        type: 'POST',
        dataType: 'json',
        data: {
            exchangeFrom: exFrom,
            exchangeTo: exTo,
            amountToExchange: amount
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {

                const exRate = result.data.result;
                $('#currency-title').html('Exchange Rate');
                $('#number-to').html(exRate);
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#currency-title').html('Currency code not found');
            $('#number-to').html('');
            console.log('POST request not fulfilled');
            handlePOSTError();
        }
    });
}

//event handlers for currency exchange modal
$('#currency-from').on('change', () => {
    getExchangeRate($('#currency-from').val(), $('#currency-to').val(), $('#number-from').val());
});

$('#currency-to').on('change', () => {
    getExchangeRate($('#currency-from').val(), $('#currency-to').val(), $('#number-from').val());
});

$('#number-from').on('change', () => {
    getExchangeRate($('#currency-from').val(), $('#currency-to').val(), $('#number-from').val());
});

/////////////////////////////////////////////////////////////////////////////
// ---WIKIPEDIA FEATURE --- ////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


//Button and modal handler
const wikiBtn = L.easyButton("fa-solid fa-w fa-xl", (btn, map) => {
    getWiki(selectedCountry);
    $("#wiki-modal").modal("show");
  });

//Function for formatting country names for Wikipedia API search
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

//Ajax call and modal population
const getWiki = (layer) => {
    $('#wiki-title').html('Loading...');
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


/////////////////////////////////////////////////////////////////////////////
// ---MAP AND FEATURE POPULATION --- ///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//function for when location found
const onLocationFound = (e) => {
    let country;
    const coordinates = [e.latitude, e.longitude];
    geojson.eachLayer((l) => {
        const boundsToCheck = l.getBounds();
        if (boundsToCheck.contains(coordinates)) {
            //mitigates against multiple locations being found
            if (!country) {
                country = l;
            } else {
                return;
            }
        }
    });
    //set initial country for currency feature
    initialCountry = country;
    //select the initial country
    handleSelectCountry(country);
}

//function for when location not found
const onLocationError = () => {
    console.log('Location not found. Random country selected.');
    initialCountry = randomCountry;
    handleSelectCountry(randomCountry);
}

//Once DOM loaded
$(document).ready(() => {

    //populate map
    map = L.map('map', {
        layers: [streets]
    }).fitWorld();

    //add layer controls
    layerControl.addTo(map);
    //add country info
    countryInfo.addTo(map);
    //add modal buttons
    newsBtn.addTo(map);
    timeBtn.addTo(map);
    weatherBtn.addTo(map);
    currencyBtn.addTo(map);
    wikiBtn.addTo(map);
    attributionsBtn.addTo(map);

    //Ajax for populating country select list
    $.ajax({
        url: "./libs/php/country-list.php",
        type: 'POST',
        dataType: 'json',
        data: {},
        success: function(result) {

            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                countryArr = result.data;
                //store a random country for when country not found
                randomCountry = countryArr[Math.random() * (countryArr.length - 1)];
                //populate select
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

    //Ajax for adding GeoJSON borders
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

                //Find initial location, initial country selected if found, otherwise select a random country
                map.locate();
                map.on('locationfound', onLocationFound);
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

});
