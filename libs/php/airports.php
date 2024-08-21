<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['API_NINJA_KEY'];
	$executionStartTime = microtime(true);

	$url='https://api.api-ninjas.com/v1/airports?country=' . $_POST['country'];
	$header= ['X-Api-Key: ' . $apiKey];

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

	if (isset($decode['error'])) {
        $output['status']['name'] = "Failure - API";
        $output['status']['description'] = $decode['error'];
  	  	$output['status']['seconds'] = number_format((microtime(true) - $executionStartTime), 3);
	  	$output['data'] = null;

		echo json_encode($output);

		exit;
	}


	$airportArr = [];
	$checkingArr = [];

	foreach ($decode as $airport) {
		if (!in_array($airport['name'], $checkingArr)) {
			array_push($airportArr, [
				'name' => $airport['name'],
				'latitude' => $airport['latitude'],
				'longitude' => $airport['longitude']
			]);
		}
		array_push($checkingArr, $airport['name']);
	}

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $airportArr;

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);
?>