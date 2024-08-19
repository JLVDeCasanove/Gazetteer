<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['WEATHER_API_KEY'];
	
	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);

	$url='https://api.weatherapi.com/v1/forecast.json?q=' . $_REQUEST['capital'] . '&days=3&key=' . $apiKey;

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);

	$forecast['lastUpdated'] = $decode['current']['last_updated'];
	$forecast['todayForecast']['conditions'] = $decode['forecast']['forecastday'][0]['day']['condition']['text'];
	$forecast['todayForecast']['imgUrl'] = $decode['forecast']['forecastday'][0]['day']['condition']['icon'];
	$forecast['todayForecast']['maxTemp'] = $decode['forecast']['forecastday'][0]['day']['maxtemp_c'];
	$forecast['todayForecast']['minTemp'] = $decode['forecast']['forecastday'][0]['day']['mintemp_c'];
	$forecast['day1Forecast']['date'] = $decode['forecast']['forecastday'][1]['date'];
	$forecast['day1Forecast']['conditions'] = $decode['forecast']['forecastday'][1]['day']['condition']['text'];
	$forecast['day1Forecast']['imgUrl'] = $decode['forecast']['forecastday'][1]['day']['condition']['icon'];
	$forecast['day1Forecast']['maxTemp'] = $decode['forecast']['forecastday'][1]['day']['maxtemp_c'];
	$forecast['day1Forecast']['minTemp'] = $decode['forecast']['forecastday'][1]['day']['mintemp_c'];
	$forecast['day2Forecast']['date'] = $decode['forecast']['forecastday'][2]['date'];
	$forecast['day2Forecast']['conditions'] = $decode['forecast']['forecastday'][2]['day']['condition']['text'];
	$forecast['day2Forecast']['imgUrl'] = $decode['forecast']['forecastday'][2]['day']['condition']['icon'];
	$forecast['day2Forecast']['maxTemp'] = $decode['forecast']['forecastday'][2]['day']['maxtemp_c'];
	$forecast['day2Forecast']['minTemp'] = $decode['forecast']['forecastday'][2]['day']['mintemp_c'];

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $forecast;
	
	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output); 
?>