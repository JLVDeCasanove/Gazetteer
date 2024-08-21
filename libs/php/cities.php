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

	$cURLERROR = curl_errno($ch);

	curl_close($ch);

	if ($cURLERROR) {

		$output['status']['code'] = $cURLERROR;
		$output['status']['name'] = "Failure - cURL";
		$output['status']['description'] = curl_strerror($cURLERROR);
		$output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
		$output['data'] = null;
	
		echo json_encode($output);
	
		exit;
	}

	$decode = json_decode($result,true);

	if (json_last_error() !== JSON_ERROR_NONE) {
		$output['status']['code'] = json_last_error();
		$output['status']['name'] = "Failure - JSON";
		$output['status']['description'] = json_last_error_msg();
		$output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
		$output['data'] = null;

		echo json_encode($output);

		exit;
	}

	if (isset($decode['message'])) {
        $output['status']['name'] = "Failure - API";
        $output['status']['description'] = $decode['message'];
  	  	$output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
	  	$output['data'] = null;

		echo json_encode($output);

		exit;
	}

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