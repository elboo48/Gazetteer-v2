<?php
	$url = file_get_contents($_REQUEST['stream']);
	$src = 'http';
	$url = strstr($url, $src);
	$str = '"';
	$url = strstr($url, $str, true);
	echo $url;


?>