<?php
	$env = parse_ini_file('../../.env');
	$apiKey = $env['GEONAMES_API_KEY'];

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);

	$url='http://api.geonames.org/countryInfoJSON?country=' . $_REQUEST['country'] . '&username=' . $apiKey;

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 2000) . " ms";
	$output['data'] = $decode['geonames'][0];

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);
?>