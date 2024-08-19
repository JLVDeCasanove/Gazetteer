<?php
    $geojson = file_get_contents('json/countryBorders.geo.json');

    $decode = json_decode($geojson, true);

    $countryArr = [];
    foreach ($decode['features'] as $country) {
        $countryInfoArr = [$country['properties']['name'], $country['properties']['iso_a2']];
        array_push($countryArr, $countryInfoArr);
    }
    sort($countryArr);

    $executionStartTime = microtime(true);

    $output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $countryArr;
    
    echo json_encode($output);
?>