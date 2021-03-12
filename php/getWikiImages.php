<?php
	
	$url = 'https://en.wikipedia.org/w/api.php?action=query&titles=' . $_REQUEST['q'] . '&prop=images&format=json';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);
	curl_close($ch);
	$decode = json_decode($result,true);	
	
	$output['data'] = $decode;
	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "sucess";

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);  
?>



