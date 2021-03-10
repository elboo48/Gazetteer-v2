
<?php
	
	$urlImg = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=extmetadata&iilimit=10&titles=File:' . $_REQUEST['q'];
	$curl = curl_init();
	curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
	curl_setopt($curl, CURLOPT_HEADER, 0);
	curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($curl, CURLOPT_URL,$urlImg);
	$deskResult = curl_exec($curl);
	curl_close($curl);
	$decoded = json_decode($deskResult,true);	

	
		
	$output['data'] = $decoded['query']['pages'];
	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "sucess";

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output);  
?>
