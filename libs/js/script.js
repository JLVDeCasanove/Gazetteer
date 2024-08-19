
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
//style options for cluster polygons
const polygonStyles = {
    fillColor: "#303A2B",
    color: "#231651",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
};
let cityMarkers = L.markerClusterGroup({
    polygonOptions: polygonStyles
 });
let airportMarkers = L.markerClusterGroup({
    polygonOptions: polygonStyles
});
let layerGroup = L.layerGroup();

//for timezone feature
let selectedTimezone;
//for time feature
let timerInterval;
//for currency feaature
let currencyListPopulated = false;

//functions
const handlePOSTError = () => {
    $('#loader').hide();
    console.log('POST request not fulfilled');
    $('.error-overlay').show();
}

const loadingComplete = () => {
    $('.modal-loader').addClass('fade-out');
}

const onModalClose = () => {
    $('.modal-loader').removeClass('fade-out');
    $('.error-overlay').hide();
}

const handleModalClose = () => {
    setTimeout(onModalClose, 500);
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
        fillColor: '#14A44D',
        weight: 5,
        color: '#231651',
        dashArray: '',
        fillOpacity: 0.5
    }
};

/* OBSOLETE STYLES
const highlightedCountryStyle = {
    fillColor: '#809848',
    weight: 3,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
};

//OLD default coutnry style
const selectedCountryStyle = {
    fillColor: '#313B72',
    weight: 2,
    opacity: 1,
    color: 'black',
    dashArray: '3',
    fillOpacity: 0.7
};

*/


const cityIcon = L.ExtraMarkers.icon({
    svg: true,
    prefix: 'fa',
    icon: 'fa-city',
    iconColor: 'white',
    markerColor: '#3B71CA',
    shape: 'square',
});

const cityIconCapital = L.ExtraMarkers.icon({
    svg: true,
    icon: 'fa-star',
    iconColor: 'white',
    markerColor: '#E4A11B',
    shape: 'square',
    prefix: 'fa'
});

const airportIcon = L.ExtraMarkers.icon({
    svg: true,
    icon: 'fa-plane',
    iconColor: 'white',
    markerColor: '#54B4D3',
    shape: 'square',
    prefix: 'fa'
});

/*
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
*/

//add layer controls
layerControl = L.control.layers(baseLayers);
layerControl.addOverlay(cityMarkers, 'Cities');
layerControl.addOverlay(airportMarkers, 'Airports');

const getCountry = async (countryCode) => {
    let layer;
    await $.ajax({
        url: "./libs/php/geojson-borders.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: countryCode
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                layer = result.data;
            } else {
                console.log('error');
            }
    
        },
        error: function(jqXHR, textStatus, errorThrown) {
            handlePOSTError();
        }
    });
    return layer;
}

const handleSelectCountry = async (countryCode) => {
    //make loader transparent to show map but disable input while country info loads
    $('#loader').css('background', '#ffffff25');
    $('#loader').show();
    //clear current marker layers
    cityMarkers.clearLayers();
    airportMarkers.clearLayers();
    layerGroup.clearLayers();
    //get country geoJson info
    const layer = await getCountry(countryCode)
    .then((layer) => selectedCountry = layer)
    .then((layer) => (L.geoJSON(layer, { style: defaultCountryStyle })).addTo(layerGroup))
    .then((layer) => map.fitBounds(layer.getBounds()))
    .then(() => {
        //update dropdown if needed
        const { iso_a2 } = selectedCountry.properties;
        if ($('#country-list').val() !== iso_a2) {
            $('#country-list').val(iso_a2);
        }
    })
    .then(async () => {
        //Update country info
        const props = await getProps(selectedCountry)
        .then((props) => countryInfo.update(props))

        //adding cities
        const cities = await getCities(selectedCountry)
            .then((cities) => cityMarkers.addLayers(cities))
            .then(() => cityMarkers.addTo(map));/*
            
        //adding airports
        const airports = await getAirports(selectedCountry)
        .then((airports) => airportMarkers.addLayers(airports))
        .then(() => airportMarkers.addTo(map));
        */
    })
    .then(() => $('#loader').hide());
}

/* OLD HANDLER
//Country Selection Handler
const handleSelectCountry = async (layer) => {
    //make loader transparent to show map but disable input while country info loads
    $('#loader').css('background', '#ffffff25');
    $('#loader').show();
    //Deselect current selected country
    if (selectedCountry) {
        geojson.resetStyle(selectedCountry);
        selectedCountry.isSelected = false;
    }
    //Set current target
    selectedCountry = layer;

    //clear marker layers
    cityMarkers.clearLayers();
    airportMarkers.clearLayers();

    //highlight the new country
    layer.setStyle(selectedCountryStyle);
    layer.bringToFront;
    //Tracking for reset style above
    layer.isSelected = true;

    //update dropdown if needed
    const { iso_a2 } = selectedCountry.feature.properties;
    if ($('#country-list').val() !== iso_a2) {
        $('#country-list').val(iso_a2);
    }

    //zoom to country
    map.fitBounds(layer.getBounds());

    //Update country info
    const props = await getProps(layer)
        .then((props) => countryInfo.update(props))
        .then(() => $('#loader').hide());
    
    //adding cities
    const cities = await getCities(layer)
        .then((cities) => cityMarkers.addLayers(cities))
        .then(() => cityMarkers.addTo(map));

    //adding airports
    const airports = await getAirports(layer)
    .then((airports) => airportMarkers.addLayers(airports))
    .then(() => airportMarkers.addTo(map));

};
*/

/////////////////////////////////////////////////////////////////////////////
// ---EVENT LISTENERS --- //////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Selecting a country with the select dropdown box
$('#country-list').on('change', (e) => {
    selectedCountry = $('#country-list').val();
    /*geojson.eachLayer((layer) => {
        if (layer.feature.properties.iso_a2 === e.target.value) {
            country = layer;
        }
    });*/
    handleSelectCountry(selectedCountry);
});

/* OLD CLICK SELECT FEATURE
//Selecting a country by clicking on the map
const selectFeature = (e) => {
    const country = e.target;
    if (country !== selectedCountry) {
        handleSelectCountry(country);
    }
};
*/

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


/* Obsolete Listeners
//tie functions to listeners
const onEachFeature = (feature, layer) => {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature
    });
}
*/


/////////////////////////////////////////////////////////////////////////////
// ---COUNTRY INFO FEATURE --- /////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Initilising custom control feature
const countryInfo = L.control({position: 'bottomleft'});

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
    this._div.innerHTML = '<div id="country-info-id"><i id="more-info" class="fa-solid fa-angle-up text-muted"></i><br><img src=https://flagsapi.com/' + iso_a2 + '/shiny/64.png>'
        + '<h4>' + iso_a2 + '</h4></div><br>'
        + '<table class="table extra-info"><tr><th class="text-start">Continent</th><td class="text-end">' + continent + '</td></tr>'
        + '<tr><th class="text-start">Capital</th><td class="text-end">' + capital + '</td></tr>'
        + '<tr><th class="text-start">Area</th><td class="text-end">' + area + ' km&sup2; </td></tr>'
        + '<tr><th class="text-start">Population</th><td class="text-end">' + population + '</td></tr></table>';
    
    $('.country-info').show();
};

//Ajax call for country info
const getProps = async (layer) => {
    const props = layer.properties;
    await $.ajax({
        url: "./libs/php/country-info.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: props.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                const {
                    continentName,
                    capital,
                    areaInSqKm,
                    population,
                    currencyCode
                } = result.data;
                props.continent = continentName;
                //fixes specific case which shows incorrect capital for Kazakstan
                if (props.iso_a2 === 'KZ') {
                    props.capital = 'Astana';
                } else {
                    props.capital = capital;
                }
                props.area = Number(areaInSqKm).toLocaleString();
                props.population = Number(population).toLocaleString();
                //adds currency code for currency feature
                props.currencyCode = currencyCode;
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('.country-info').hide();
            handlePOSTError();
        }
    });
    return props;
}

//Toggle detailed info by clicking on the info box
$('#map').on('mouseenter', '.country-info', () => {
    $('.extra-info').show();
    $('#more-info').hide();
});

$('#map').on('mouseleave', '.country-info', () => {
    $('.extra-info').hide();
    $('#more-info').show();
});


/////////////////////////////////////////////////////////////////////////////
// ---MAP MARKERS FEATURE --- //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//------------CITY LAYER------------//

//Get city info and store in marker groups
const getCities = async (layer) => {
    let cityArr = [];
    const layerData = layer.properties;
    await $.ajax({
        url: "./libs/php/cities.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layerData.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                let checkingArr = [];
                const resultArray = result.data;
                resultArray.forEach((city) => {
                    //checking array to avoid duplicates from API call
                    if (!checkingArr.includes(city.name)) {
                        //check info stored by country info feature to identify capital and give different marker
                        //Plus additional cases where API calls were mismatched
                        if (city.name === layerData.capital || city.name === 'Reykjavík' || city.name === 'Delhi'|| city.name === 'City of Brussels'|| city.name === 'Naypyidaw') {
                            //Store capital lat and lng data for timezone feature
                            layerData.capitalLat = city.latitude;
                            layerData.capitalLng = city.longitude;
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIconCapital}).bindPopup('<p>' + city.name + '</p>'));
                        } else {
                            cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIcon}).bindPopup('<p>' + city.name + '</p>'));
                        }
                        checkingArr.push(city.name);
                    }
                });
                //Manually add Washington for US as API call was unable to retrieve without sub-optimal params
                if (layerData.iso_a2 === 'US') {
                    cityArr.push(L.marker([38.89511, -77.03637], {icon: cityIconCapital}).bindPopup('<p>Washington</p>'));
                    layerData.capitalLat = 38.89511;
                    layerData.capitalLng = -77.03637;
                }
            } else {
                console.log('error');
            }

        },
        error: function(jqXHR, textStatus, errorThrown) {
            handlePOSTError();
        }
    });
    return cityArr;
};

//------------AIRPORTS LAYER---------//

//Get airport info and store in marker groups
const getAirports = async (layer) => {
    const layerData = layer.properties;
    let airportArr = [];
    await $.ajax({
        url: "./libs/php/airports.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layerData.iso_a2
        },
        success: function(result) {
    
            console.log(JSON.stringify(result));
            
            if (result.status.name == "ok") {
                const resultArr = result.data;
                resultArr.forEach((airport) => {
                    airportArr.push(L.marker([airport.latitude, airport.longitude], {icon: airportIcon}).bindPopup('<p>' + airport.name + '</p>'));
                });

            } else {
                console.log('error');
            }
        
        },
        error: function(jqXHR, textStatus, errorThrown) {
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

//On modal close
$('#news-modal').on('hidden.bs.modal', () => {
    handleModalClose();
});

//Ajax call and modal population
const getNews = (layer) => {
    const layerData = layer.properties;
    $('news-body').html('<p>Loading Local News...</p>');
    $.ajax({
        url: "./libs/php/news.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: layerData.iso_a2
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
                    loadingComplete();
                } else {
                    $('#news-body').html('<tr><th>No Local News Found</th></tr>');
                }
                
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
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
    const sec = targetDate.getSeconds();
    const currentTime = `${hour.toString().padStart(2, 0)} : ${min.toString().padStart(2, 0)} : ${sec.toString().padStart(2, 0)}`;

    $('#time-digital').html(currentTime);
}

//Clear interval on modal close
$('#time-modal').on('hide.bs.modal', () => {
    clearInterval(timerInterval);
    handleModalClose();
});

//Ajax call and modal population
const getTime = (layer) => {
    const layerInfo = layer.properties;
    $('#time-title').html('Loading...');
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
                $('#utc-offset').html('UTC + ' + timezoneInfo.gmtOffset);
                //digital clock
                timerInterval = setInterval(showTime, 100);
                showTime();
                loadingComplete();
            } else {
                console.log('error');
                loadingComplete();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#time-title').html('Timezone not found.');
            handlePOSTError();
            loadingComplete();
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

//On modal close
$('#weatherModal').on('hidden.bs.modal', () => {
    handleModalClose();
});

const hideForecast = () => {
    $('#weather-today-title').html('&nbsp;');
    $('#weather-today-conditions').html('&nbsp;');
    $('#weather-today-img').attr('src', '');
    $('#weather-today-max-temp').html('&nbsp;');
    $('#weather-today-min-temp').html('&nbsp;');
    $('#weather-day1-date').html('&nbsp;');
    $('#weather-day1-img').attr('src', '');
    $('#weather-day1-img').attr('alt', '');
    $('#weather-day1-img').attr('title', '');
    $('#weather-day1-max-temp').html('&nbsp;');
    $('#weather-day1-min-temp').html('&nbsp;');
    $('#weather-day2-date').html('&nbsp;');
    $('#weather-day2-img').attr('src', '');
    $('#weather-day2-img').attr('alt', '');
    $('#weather-day2-img').attr('title', '');
    $('#weather-day2-max-temp').html('&nbsp;');
    $('#weather-day2-min-temp').html('&nbsp;');
    $('#last-updated').html('&nbsp;');
}

//Ajax call and modal population
const getWeather = (layer) => {
    const { capital } = layer.properties;
    $('#weather-title').html('Loading...')

    $.ajax({
        url: "./libs/php/weather.php",
        type: 'POST',
        dataType: 'json',
        data: {
            capital: capital
        },
        success: function(result) {

            console.log(JSON.stringify(result));
            if (result.status.name == "ok") {
                const {
                    todayForecast,
                    day1Forecast,
                    day2Forecast,
                    lastUpdated
                } = result.data;
                $('#weather-title').html(capital);
                $('#weather-today-title').html('TODAY');
                $('#weather-today-conditions').html(todayForecast.conditions);
                $('#weather-today-img').attr('src', todayForecast.imgUrl);
                $('#weather-today-max-temp').html(todayForecast.maxTemp);
                $('#weather-today-min-temp').html(todayForecast.minTemp);
                $('#weather-day1-date').html(Date.parse(day1Forecast.date).toString('ddd dS'));
                $('#weather-day1-img').attr('src', day1Forecast.imgUrl);
                $('#weather-day1-img').attr('alt', day1Forecast.conditions);
                $('#weather-day1-img').attr('title', day1Forecast.conditions);
                $('#weather-day1-max-temp').html(day1Forecast.maxTemp);
                $('#weather-day1-min-temp').html(day1Forecast.minTemp);
                $('#weather-day2-date').html(Date.parse(day2Forecast.date).toString('ddd dS'));
                $('#weather-day2-img').attr('src', day2Forecast.imgUrl);
                $('#weather-day2-img').attr('alt', day2Forecast.conditions);
                $('#weather-day2-img').attr('title', day2Forecast.conditions);
                $('#weather-day2-max-temp').html(day2Forecast.maxTemp);
                $('#weather-day2-min-temp').html(day2Forecast.minTemp);
                $('#last-updated').html('Last Updated: ' + Date.parse(lastUpdated).toString("HH:mm, dS MMM"));
                loadingComplete();
            } else {
                $('#weather-title').html('Forecast not Found')
                hideForecast();
                handlePOSTError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#weather-title').html('Forecast not Found')
            hideForecast();
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

//On modal close
$('#currency-modal').on('hidden.bs.modal', () => {
    handleModalClose();
});

const handleCurrencyButton = async () => {
    const defaultExFrom = initialCountry.feature.properties.currencyCode;
    const defaultExTo = selectedCountry.feature.properties.currencyCode;
    //populate the select lists if empty
    if (!currencyListPopulated) {
        await populateCurrencyList();
    } else {
        //sets default currency to exchange from to the initial country set upon page load.
        $('#currency-from').val(defaultExFrom);
        //sets default currency to exchange to to the country currently selected.
        $('#currency-to').val(defaultExTo);
    }
    $('#number-from').val(1);
    exFrom = $('#currency-from').val();
    exTo =  $('#currency-to').val();
    //show currency not found if selected country is not in list
    if (!defaultExTo) {
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
                loadingComplete();
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#currency-title').html('Currency code not found');
            $('#number-to').html('');
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

//On modal close
$('#wiki-modal').on('hidden.bs.modal', () => {
    handleModalClose();
});

//Function for formatting country names for Wikipedia API search
const formatCountry = (country) => {
    let formattedCountry;
    if (country.includes("d'Ivoire")) {
        formattedCountry = 'Ivory%20Coast';
    } else if (country === 'Swaziland') {
        formattedCountry = 'Eswatini';
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
    const countryRequest = layer.properties.name;
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
                const summaryWithLink = wikiEntry.summary.replace('...', '<a href="https://' + wikiEntry.wikipediaUrl + '" target="_blank" title="read full article">...</a>')
                $('#wiki-summary').html(summaryWithLink);
                loadingComplete();
            } else {
                console.log('error');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#wiki-title').html('Entry not found');
            $('#wiki-summary').html('Please go to <a href="https://www.wikipedia.org/">https://www.wikipedia.org/</a> and search manually.');
            handlePOSTError();
        }
    });
}


/////////////////////////////////////////////////////////////////////////////
// ---MAP AND FEATURE POPULATION --- ///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

//function for when location found
const onLocationFound = async (e) => {
    let country;
    const coordinates = [e.latitude, e.longitude];
    const response = await fetch('./libs/php/json/countryBorders.geo.json');
    const json = await response.json();
    const geoJson = await L.geoJSON(json);
    try {
        geoJson.eachLayer((l) => {
            const boundsToCheck = l.getBounds();
            if (boundsToCheck.contains(coordinates)) {
                //mitigates against multiple locations being found
                if (!country) {
                    country = l.feature.properties.iso_a2;
                } else {
                    return;
                }
            }
        })
        //set initial country for currency feature
        initialCountry = country;
        //select the initial country
        handleSelectCountry(country);
    } catch (err) {
        console.log(err);
    }
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

    layerGroup.addTo(map);

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
                    $('#country-list').append('<option value=\"' + country[1] + '\">' + country[0] + '</option>');
                });

            } else {
                console.log('error');
            }
        
        },
        error: function(jqXHR, textStatus, errorThrown) {
            handlePOSTError();
        }
    });


    //Find initial location, initial country selected if found, otherwise select a random country
    map.locate();
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    /*OLD CODE FOR POPULATING BORDERS
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
            handlePOSTError();
        }
    });
    */

});
