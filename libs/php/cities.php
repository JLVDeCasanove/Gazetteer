<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['RAPID_API_KEY'];

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);

	$url='https://wft-geo-db.p.rapidapi.com/v1/geo/cities?types=CITY&countryIds=' . $_REQUEST['country'] . '&limit=10&sort=-population';
	$header= ['x-rapidapi-host: wft-geo-db.p.rapidapi.com', 'x-rapidapi-key: ' . $apiKey];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	curl_setopt($ch, CURLOPT_HTTPHEADER, $header);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);

	$cityArr = [];
	$checkingArr = [];

	foreach ($decode['data'] as $city) {
		if (!in_array($city['name'], $checkingArr)) {
			array_push($cityArr, [
				'name' => $city['name'],
				'latitude' => $city['latitude'],
				'longitude' => $city['longitude']
			]);
		}
		array_push($checkingArr, $city['name']);
	}

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $cityArr;

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);
?>