<?php
$json = file_get_contents("large_airports2.json");
$data = json_decode($json, true);
$airports = array();
for ($i = 0; $i < count($data); $i++) {
	if ($_REQUEST['cc'] == $data[$i]['iso_country']) 
	array_push($airports, $data[$i]);
};
echo json_encode($airports);
?>
