<?php
	$imageUrls = array();
	$url = 'https://en.wikipedia.org/w/api.php?action=query&titles=' . $_REQUEST['q'] . '&prop=images&format=json';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$decode = json_decode($result,true);	
	$imagesKey = key($decode['query']['pages']);
	foreach($decode['query']['pages'][$imagesKey]['images'] as $imageArray) {
        if($imageArray['title'] != 'File:Commons-logo.svg' && $imageArray['title'] != 'File:P vip.svg') {
            $title = str_replace('File:', '', $imageArray['title']);
            $title = str_replace(' ', '_', $title);
			$imageUrls[] = $title; 
		}
	}
	$output['data'] = $imageUrls;
	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "sucess";

	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output); 
?>



