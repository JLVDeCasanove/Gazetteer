<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['RAPID_API_KEY'];

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);

	$url='https://currency-conversion-and-exchange-rates.p.rapidapi.com/convert?from=' . $_REQUEST['exchangeFrom'] . '&to=' . $_REQUEST['exchangeTo'] . '&amount=1';
	$header= ['x-rapidapi-host: currency-conversion-and-exchange-rates.p.rapidapi.com', 'x-rapidapi-key: ' . $apiKey];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	curl_setopt($ch, CURLOPT_HTTPHEADER, $header);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $decode;

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);
?>