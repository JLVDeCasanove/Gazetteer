<?php
    $env = parse_ini_file('../../.env');
	$apiKey = $env['THE_NEWS_API_KEY'];
	$userAgent = $_SERVER['HTTP_USER_AGENT'];

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true);
	$url='https://api.thenewsapi.com/v1/news/top?api_token=' . $apiKey . '&locale=' . $_REQUEST['country'];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);


	$i = 0;
	while ($i < 3) {
		$headlines['news' . $i + 1]['headline'] = $decode['data'][$i]['title'];
		$headlines['news' . $i + 1]['link'] = $decode['data'][$i]['url'];
		$headlines['news' . $i + 1]['rawTime'] = $decode['data'][$i]['published_at'];
		$headlines['news' . $i + 1]['img'] = $decode['data'][$i]['image_url'];
		$i++;
	}

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $headlines;

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);
?>