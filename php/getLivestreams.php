<?php

	$executionStartTime = microtime(true) / 1000;

	$url='https://api.windy.com/api/webcams/v2/list/country=' . $_REQUEST['cc'] . '/property=live/orderby=popularity/limit=50?show=webcams:location,statistics,player,image&key=5ufcHs7rv5PzJeOohHkFvvMoFhwXwtMS';
	
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);

	curl_close($ch);

	$decode = json_decode($result,true);	

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "sucess";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
	$output['data'] = $decode['result']['webcams'];
	
	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output); 

?>