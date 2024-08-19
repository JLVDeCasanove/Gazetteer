<?php
    $geojson = file_get_contents('json/countryBorders.geo.json');

    $decode = json_decode($geojson, true);
    $executionStartTime = microtime(true);
    $selectedCountry = $_REQUEST['country'];

    foreach ($decode['features'] as $country) {
        if ($country['properties']['iso_a2'] === $selectedCountry) {
            $selectedCountryData = $country;
            break;
        }
    }

    $output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "success";
	$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
	$output['data'] = $selectedCountryData;

    echo json_encode($output);
?>