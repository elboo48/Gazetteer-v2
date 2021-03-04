<?php
$json = file_get_contents("countryBorders.geo.json");
$data = json_decode($json, true);
$output = array();
for ($i = 0; $i < count($data['features']); $i++) {
	$key = $data['features'][$i]['properties']['name'];
	$output[$key] = $data['features'][$i]['properties']['iso_a2'];
}
ksort($output);
echo json_encode($output); 
?>
