<?php
    $geojson = file_get_contents('C:\xampp\htdocs\project1\libs\php\json\countryBorders.geo.json');

    $decode = json_decode($geojson, true);

    $countryArr = [];
    foreach ($decode['features'] as $country) {
        array_push($countryArr, $country['properties']['name']);
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