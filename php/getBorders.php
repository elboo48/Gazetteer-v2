
<?php
$json = file_get_contents("countryBorders.geo.json");
$data = json_decode($json, true);
for ($i = 0; $i < count($data['features']); $i++) {
	if ($_REQUEST['cc'] == $data['features'][$i]['properties']['iso_a2']) 
	echo json_encode($data['features'][$i]['geometry']);
}
?>
