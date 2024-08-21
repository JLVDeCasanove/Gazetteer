
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
    Toastify({
        text: "An error occured when trying to fetch data from server",
        duration: 3000,
        close: true,
        style: {
            background: 'linear-gradient(to right, #dc3545, #ea868f)',
            color : 'white'
        }
      }).showToast();
}

handleModalError = () => {
    $('.error-overlay').show();
    loadingComplete();
}

const loadingComplete = () => {
    $('.modal-loader').addClass('fade-out');
}

const onModalClose = () => {
    $('.error-overlay').hide();
    $('.modal-loader').removeClass('fade-out');
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
        weight: 4,
        color: '#231651',
        dashArray: '',
        fillOpacity: 0.5
    }
};

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
            if (result.status.name == "ok") {
                layer = result.data;
            } else {
                handlePOSTError();
            }
    
        },
        error: function(jqXHR, textStatus, errorThrown) {
            handlePOSTError();
        }
    });
    return layer;
}

/////////////////////////////////////////////////////////////////////////////
// ---HANDLING COUNTRY SELECT --- //////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


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
        if (!initialCountry) {
            initialCountry = selectedCountry;
        }
    })
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
            .then(() => cityMarkers.addTo(map));
            
        //adding airports
        const airports = await getAirports(selectedCountry)
        .then((airports) => airportMarkers.addLayers(airports))
        .then(() => airportMarkers.addTo(map));
        
    })
    .then(() => $('#loader').hide());
}

//Selecting a country with the select dropdown box
$('#country-list').on('change', (e) => {
    handleSelectCountry($('#country-list').val());
});


/////////////////////////////////////////////////////////////////////////////
// ---COUNTRY INFO FEATURE --- /////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

const countryInfo = L.control();
//checks where to put the country info screen based on screen height
const checkInfoPosition = () => {
    if (window.matchMedia('(max-height: 480px)').matches) {
        countryInfo.setPosition('bottomright');
    } else {
        countryInfo.setPosition('bottomleft');
    }
}
checkInfoPosition();

//check on resize
$(window).resize(() => {
    checkInfoPosition();
    countryInfo.update(selectedCountry.properties);
});

//create element when added to map
countryInfo.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'country-info');
    return this._div;
};

//update properties and add to element
countryInfo.update = function (props) {
    const { iso_a2,
            continent,    
            capital,
            area,
            population
    } = props;

    //dynamic element creation
    this._div.innerHTML = '<div id="country-info-id"><i id="more-info" class="fa-solid fa-angle-up text-muted"></i><i id="close-more-info" class="fa-solid fa-angle-down text-muted"></i><br><img src=https://flagsapi.com/' + iso_a2 + '/shiny/64.png>'
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
                $('.country-info').hide();
                handlePOSTError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('.country-info').hide();
            handlePOSTError();
        }
    });
    return props;
}

const hideExtraInfo = () => {
    $('.extra-info').hide();
    $('#more-info').show();
    $('#close-more-info').hide();
}

const showExtraInfo = () => {
    $('.extra-info').show();
    $('#more-info').hide();
}

let extraInfo = false;

//Toggle detailed info by mousing over
$('#map').on('mouseenter', '.country-info', () => {
    if (window.matchMedia('(min-width: 769px)').matches) {
        showExtraInfo();
    }
});

$('#map').on('mouseleave', '.country-info', () => {
    if (window.matchMedia('(min-width: 769px)').matches) {
        hideExtraInfo();
    }
});

//toggle detailed info on click on moble devices
$('#map').on('click', '.country-info', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
        hideExtraInfo();
    }
});

$('#map').on('click', '.country-info', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
        if (extraInfo) {
            hideExtraInfo();
            extraInfo = false;
        } else {
            showExtraInfo();
            $('#close-more-info').show();
            extraInfo = true;
        }
    }
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
            if (result.status.name == "ok") {
                let checkingArr = [];
                const resultArray = result.data;
                resultArray.forEach((city) => {
                    //check info stored by country info feature to identify capital and give different marker
                    //Plus additional cases where API calls were mismatched
                    if (city.name === layerData.capital || city.name === 'Reykjavík' || city.name === 'Delhi'|| city.name === 'City of Brussels'|| city.name === 'Naypyidaw') {
                        //Store capital lat and lng data for timezone feature
                        layerData.capitalLat = city.latitude;
                        layerData.capitalLng = city.longitude;
                        //create marker group
                        cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIconCapital}).bindPopup('<p>' + city.name + '</p>'));
                    } else {
                        cityArr.push(L.marker([city.latitude, city.longitude], {icon: cityIcon}).bindPopup('<p>' + city.name + '</p>'));
                    }
                });
                //Manually add Washington for US as API call was unable to retrieve without sub-optimal params
                if (layerData.iso_a2 === 'US') {
                    cityArr.push(L.marker([38.89511, -77.03637], {icon: cityIconCapital}).bindPopup('<p>Washington</p>'));
                    layerData.capitalLat = 38.89511;
                    layerData.capitalLng = -77.03637;
                }
            } else {
                handlePOSTError();
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
            if (result.status.name == "ok") {
                const resultArr = result.data;
                resultArr.forEach((airport) => {
                    airportArr.push(L.marker([airport.latitude, airport.longitude], {icon: airportIcon}).bindPopup('<p>' + airport.name + '</p>'));
                });

            } else {
                handlePOSTError();
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

const hideNews = () => {
    $('#news-1-headline').html('&nbsp;');
    $('#news-1-link').attr('src', '');
    $('#news-1-time').html('&nbsp;')
    $('#news-1-img').attr('src', '');
    $('#news-2-headline').html('&nbsp;');
    $('#news-2-link').attr('src', '');
    $('#news-2-time').html('&nbsp;')
    $('#news-2-img').attr('src', '');
    $('#news-3-headline').html('&nbsp;');
    $('#news-3-link').attr('src', '');
    $('#news-3-time').html('&nbsp;')
    $('#news-3-img').attr('src', '');
}

//Ajax call and modal population
const getNews = async (layer) => {
    const { iso_a2 } = layer.properties;
    targetCountry = iso_a2.toLowerCase();
    hideNews();
    $('#news-title').html('Getting local news...');
    $.ajax({
        url: "./libs/php/news.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: targetCountry,
        },
        success: function(result) {
            if (result.status.name == "ok") {
                const { 
                    news1,
                    news2,
                    news3,
                } = result.data;

                const convertToElapsedTime = (date) => {
                    const day = 86400000;
                    const hour = 3600000;
                    const min = 60000;
                    const now = Date.now();
                    const diff = now - date;
                    if (diff >= day * 7) {
                        return 'More than a week ago';
                    } else if (diff >= day) {
                        days = Math.floor(diff / day);
                        if (days > 1) {
                            return days + ' days ago';
                        } else {
                            return 'yesterday';
                        };
                    } else if (diff >= hour) {
                        hours = Math.floor(diff / hour);
                        if (hours >= 1) {
                            return hours + ' hours ago';
                        } else {
                            return '1 hour ago';
                        }
                    } else if (diff >= min) {
                        const mins = Math.floor(diff/min);
                        if (mins > 1) {
                            return mins + ' mins ago';
                        } else {
                            return '1 minute ago';
                        }
                    } else {
                        return 'Less than a minute ago';
                    }
                }

                news1.time = convertToElapsedTime(new Date(news1.rawTime));
                news2.time = convertToElapsedTime(new Date(news2.rawTime));
                news3.time = convertToElapsedTime(new Date(news3.rawTime));

                $('#news-title').html('Top Headlines');
                $('#news-1-img').attr('src', news1.img);
                $('#news-1-headline').html(news1.headline);
                $('#news-1-headline').attr('href', news1.link);
                $('#news-1-time').html(news1.time);
                $('#news-2-img').attr('src', news2.img);
                $('#news-2-headline').html(news2.headline);
                $('#news-2-headline').attr('href', news2.link);
                $('#news-2-time').html(news2.time)
                $('#news-3-img').attr('src', news3.img);
                $('#news-3-headline').html(news3.headline);
                $('#news-3-headline').attr('href', news3.link);
                $('#news-3-time').html(news3.time);
                loadingComplete();
            } else {
                $('#news-title').html('No Local News Found');
                hideNews();
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#news-title').html('No Local News Found');
            hideNews();
            handleModalError();
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

//Handle modal close
$('#time-modal').on('hide.bs.modal', () => {
    clearInterval(timerInterval);
    handleModalClose();
});

const hideTime = () => {
    $('#time-digital').html('&nbsp;')
    $('#utc-offset').html('&nbsp;');
}

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

//Ajax call and modal population
const getTime = (layer) => {
    const layerInfo = layer.properties;
    hideTime();
    $('#time-title').html('Getting local time...');
    $.ajax({
        url: "./libs/php/timezone.php",
        type: 'POST',
        dataType: 'json',
        data: {
            latitude: layerInfo.capitalLat,
            longitude: layerInfo.capitalLng
        },
        success: function(result) {
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
                $('#time-title').html('Timezone not found.');
                hideTime();
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#time-title').html('Timezone not found.');
            hideTime();
            handleModalError();
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
$('#weather-modal').on('hidden.bs.modal', () => {
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
    $('#weather-title').html('Getting local weather...')

    $.ajax({
        url: "./libs/php/weather.php",
        type: 'POST',
        dataType: 'json',
        data: {
            capital: capital
        },
        success: function(result) {
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
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#weather-title').html('Forecast not Found')
            hideForecast();
            handleModalError();
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

//function to convert ExRate
const formatExRate = (targetExTo, rate) => {
    zeroDecPlaces = ['CVE', 'DJF', 'GNF', 'IDR', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
    threeDecPlaces = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];
    if (zeroDecPlaces.includes(targetExTo)) {
        return Math.round(rate);
    } else if (threeDecPlaces.includes(targetExTo)) {
        return parseFloat(rate.toFixed(3));
    } else {
        return parseFloat(rate.toFixed(2));
    }
};

const handleCurrencyButton = async () => {
    const defaultExFrom = initialCountry.properties.currencyCode;
    const defaultExTo = selectedCountry.properties.currencyCode;
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
        loadingComplete();
    //show message if currency codes to and from are equal
    } else if (exFrom === exTo) {
        $('#currency-title').html('Please select 2 different currencies to convert');
        $('#number-to').html('');
        loadingComplete();
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
            if (result.status.name == "ok") {
                const currencyArr = result.data;
                currencyArr.forEach((currency) => {
                    $('#currency-from').append('<option value="' + currency.code + '">' + currency.name + '</option>');
                    $('#currency-to').append('<option value="' + currency.code + '">' + currency.name + '</option>');
                })
                currencyListPopulated = true;
                $('#currency-from').val(initialCountry.properties.currencyCode);
                $('#currency-to').val(selectedCountry.properties.currencyCode);
            } else {
                $('#currency-title').html('Currency code Not found...');
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#currency-title').html('Currency code Not found...');
            handleModalError();
        }
    });
}

//Ajax call and modal population
const getExchangeRate = (exFrom, exTo, amount) => {
    $('#currency-title').html('Getting exchange rates...');
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
            if (result.status.name == "ok") {
                const exRate = result.data.result;
                const formattedExRate = formatExRate(exTo, exRate);
                $('#currency-title').html('Exchange Rate');
                $('#number-to').val(formattedExRate);
                loadingComplete();
            } else {
                $('#currency-title').html('Currency code not found');
                $('#number-to').val('');
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#currency-title').html('Currency code not found');
            $('#number-to').val('');
            handleModalError();
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
const wikiBtn = L.easyButton("fa-solid fa-book fa-xl", (btn, map) => {
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
    $('#wiki-title').html('Getting Wiki entries...');
    $('#wiki-summary').html('&nbsp;');
    const { name } = layer.properties;
    const formattedCountry = formatCountry(name);
    $.ajax({
        url: "./libs/php/wikipedia.php",
        type: 'POST',
        dataType: 'json',
        data: {
            country: formattedCountry
        },
        success: function(result) {
            if (result.status.name == "ok") {
                const wikiEntry = result.data;
                const summaryWithLink = wikiEntry.summary.replace('...', '<a href="https://' + wikiEntry.wikipediaUrl + '" target="_blank" title="read full article">...</a>')
                $('#wiki-summary').html(summaryWithLink);
                loadingComplete();
            } else {
                $('#wiki-title').html('Entry not found');
                $('#wiki-summary').html('Please go to <a href="https://www.wikipedia.org/">https://www.wikipedia.org/</a> and search manually.');
                handleModalError();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#wiki-title').html('Entry not found');
            $('#wiki-summary').html('Please go to <a href="https://www.wikipedia.org/">https://www.wikipedia.org/</a> and search manually.');
            handleModalError();
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
        //select the initial country
        handleSelectCountry(country);
    } catch (err) {
        handlePOSTError();
    }
}

//function for when location not found
const onLocationError = () => {
    Toastify({
        text: "Your locatuion could not be found. Random country selected.",
        duration: 3000,
        close: true,
        style: {
            background: 'linear-gradient(to right, #ffc107, #ffda6a)',
            color : 'black'
        }
      }).showToast();
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
            if (result.status.name == "ok") {
                countryArr = result.data;
                //store a random country for when country not found
                randomCountry = countryArr[Math.random() * (countryArr.length - 1)];
                //populate select
                countryArr.forEach((country) => {
                    $('#country-list').append('<option value=\"' + country[1] + '\">' + country[0] + '</option>');
                });

            } else {
                handlePOSTError();
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

});
