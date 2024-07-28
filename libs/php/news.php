<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['NEWS_API_KEY'];
	$userAgent = $_SERVER['HTTP_USER_AGENT'];

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);
	$header = ['User-agent: ' . $userAgent];
	$url='https://newsapi.org/v2/top-headlines?pageSize=10&country=' . $_REQUEST['country'] . '&apiKey=' . $apiKey;

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