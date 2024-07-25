<?php
    $geojson = file_get_contents($_SERVER['DOCUMENT_ROOT'] . 'libs/json/countryBorders.geo.json');
    echo $geojson;
?>