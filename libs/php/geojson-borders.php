<?php
    $geojson = file_get_contents('countryBorders.geo.json');
    $decode = json_decode($geojson, true);
    $executionStartTime = microtime(true);

    $output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $decode;
    
    echo json_encode($output);
?>