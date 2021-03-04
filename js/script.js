// alias Luxon DateTime
let DateTime = luxon.DateTime;

// hide spinner until select box chosen (in case geolocation browser function disabled)
$('#spinner').hide();

// leaflet tile basemaps creation
let mapTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA', label: 'Satellite'	
});
let blueMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}@2x.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19,
	label: 'Roads'
})
let blackMap = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/{time}/{tilematrixset}{maxZoom}/{z}/{y}/{x}.{format}', {
		attribution: 'Imagery by GIBS, NASA/GSFC/<a href="https://earthdata.nasa.gov">ESDIS</a>.',
		bounds: [[-85.0511287776, -179.999999975], [85.0511287776, 179.999999975]],
		minZoom: 1,
		maxZoom: 8,
		format: 'jpg',
		time: '',
		tilematrixset: 'GoogleMapsCompatible_Level',
		label: 'Night'
	}) 
let basemaps = [blueMap, mapTiles, blackMap];

// initialise map
let map = L.map('mapid', {
	attributionControl: false
}).addLayer(blueMap).setView([55.505, 5.09], 4);

// initialise attribution 
L.control.attribution({
	position: 'bottomleft'
}).addTo(map);

// add basemaps control
map.addControl(L.control.basemaps({
	basemaps: basemaps,
	tileX: 4,  // tile X coordinate
	tileY: 2,  // tile Y coordinate
	tileZ: 3   // tile zoom level
}));

// Create additional control placeholder for select bar
function addControlPlaceholders(map) {
	let corners = map._controlCorners,
		l = 'leaflet-',
		container = map._controlContainer;
	function createCorner(vSide, hSide) {
		let className = l + vSide + ' ' + l + hSide;
		corners[vSide + hSide] = L.DomUtil.create('div', className, container);
	}
	createCorner('top', 'horizontalcenter');
}
addControlPlaceholders(map);

// create box for title and select bar
let selectBox = L.control({ position: 'tophorizontalcenter' });
selectBox.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'selectBox');
	this.update();
	return this._div;
};
selectBox.update = function (x) {
	this._div.innerHTML = '<select id="country-select" name="country"><option selected value="">Pick a country</option></select>'
};
selectBox.addTo(map);

// create weather tile layers
let clouds = L.OWM.clouds({ showLegend: false, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' }); 
let rain = L.OWM.rain({ showLegend: false, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' });
let snow = L.OWM.snow({ showLegend: false, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' });

// create select button and populate from json file
let jsonData = $.ajax({
    url: "php/getSelect.php",
    dataType: "json",
    async: false
}).responseText;
let jArr = JSON.parse(jsonData);
let ele = document.getElementById('country-select');
for (const [key, value] of Object.entries(jArr)) {
	ele.innerHTML = ele.innerHTML + '<option value="' + value + '">' + key + '</option>';
}

// create onload location select event 
function usePosition(position) {
	let q = position.coords.latitude + '%2C' + position.coords.longitude;
	$.ajax({
		url: "php/getOpenCageR.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: q
		},
		success: function (result) {
			if (result.status.name == "ok") {
				$('#country-select').val(result.data[0].components['ISO_3166-1_alpha-2']).trigger('change');		
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 
}
function errorCallback(e) {
	console.log("position error");
}
if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(usePosition, errorCallback, { timeout: 30000, enableHighAccuracy: true, maximumAge: 75000 });
}

// initialise cluster groups
let cityCluster;
let airportCluster;
let musCluster;
let uniCluster;
let thrCluster
let hospCluster;
let libCluster;
let trainCluster;
let metroCluster;
let busCluster;

// thousand comma function
function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// select event leading to API calls and map shift
$('#country-select').on('change', function () {
	//NEED TO REVIEW FOR REDUNDANT 
	$('#spinner').show();
	$('.leaflet-control-layers-selector').prop('checked', false); 
	$('.leaflet-control-layers-toggle').remove();
	$('div.leaflet-pane.leaflet-map-pane.div.leaflet-pane.leaflet-marker-pane').empty();
	$('path.leaflet-interactive').remove();
	$('div.leaflet-pane.leaflet-marker-pane').empty();
	$('.info.leaflet-control').remove();
	$('.weatherBox.leaflet-control').remove();
	$('.news.leaflet-control').remove();
	$('.finance.leaflet-control').remove();
	$('div.beautify-marker').parent().remove();
	$('#airports-marker-toggle').parent().remove();
	$('#lib-marker-toggle').parent().remove();
	$('div.leaflet-control-layers.leaflet-control').remove();
	let toggleArray = [];

	// map draw boundary and shuffle using bounds
	let jsonBoundsData = $.ajax({
		url: "php/getBorders.php",
		dataType: "json",
		async: false,
		data: {
			cc: this.value,
		},
	}).responseText;
	let jBoundsArr = JSON.parse(jsonBoundsData);
	let bounds = new L.geoJSON(jBoundsArr, {
		style: {
			fillColor: "#8935e8",
			weight: 2,
			opacity: 1,
			color: 'white',
			dashArray: '3',
			fillOpacity: 0.1
		}
		}).addTo(map);
	bounds = bounds.getBounds();
	map.flyToBounds(bounds); 

	// draw country button box and populate
	let info = L.control({ position: 'topleft' });
	info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
		};
	info.update = function (x) {
		this._div.innerHTML = '<div id="infoBox"></div>' 
			};	
	info.addTo(map);

	// launch country modal on click 
	$('.info').click(function (event) {
		$('#countryModal').modal('toggle');
	});

	// draw weather button box and populate
	let weatherBox = L.control({ position: 'topleft' });
	weatherBox.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'weatherBox');
		this.update();
		return this._div;
	};
	weatherBox.update = function (x) {
		this._div.innerHTML = '<div id="weatherIconDiv"><i class="fas fa-cloud-sun fa-2x"></i></div>' 	
	};
	weatherBox.addTo(map);

	// launch weather modal on click 
	$('.weatherBox').click(function (event) {
		$('#weatherModal').modal('toggle');
	});

	// draw news button box and populate
	let news = L.control({ position: 'topleft' });
	news.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'news');
		this.update();
		return this._div;
	};
	news.update = function (x) {
		this._div.innerHTML = '<div id="newsIconDiv"><i class="fas fa-newspaper fa-2x"></i></div>'
	};
	news.addTo(map);

	// launch news modal on click 
	$('.news').click(function (event) {
		$('#newsModal').modal('toggle');
	});

	// draw finance button box and populate
	let finance = L.control({ position: 'topleft' });
	finance.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'finance');
		this.update();
		return this._div;
	};
	finance.update = function (x) {
		this._div.innerHTML = '<div id="financeIconDiv"><i class="fas fa-coins fa-2x"></i></div>'
	};
	finance.addTo(map);

	// launch news modal on click 
	$('.finance').click(function (event) {
		$('#financeModal').modal('toggle');
	});

	// add function to weather checkboxes and call legend adjust functions to avoid attribution overlap on small devices
	$('#clouds').change(function () {
		if ($(this).is(':checked')) {
			clouds.addTo(map);
			leg_bottom_adjust(); 
		} else {
			map.removeLayer(clouds);
			if (!$('#rain').is(':checked')) {
				leg_bottom_undo()
			};
		};
	});
	$('#rain').change(function () {
		if ($(this).is(':checked')) {
			rain.addTo(map);
			leg_bottom_adjust()
		} else {
			map.removeLayer(rain);
			if (!$('#clouds').is(':checked') ) {
				leg_bottom_undo() 
			};	
		};
	});
	
	// get select key data for API call
	function getKeyByValue(object, value) {
		return Object.keys(object).find(key =>
			object[key] === value);
	}
	countryKey = getKeyByValue(jArr, this.value);
	let encCountryKey = encodeURIComponent(countryKey)

	// get Wiki images
	$.ajax({
		url: "php/getWikiImages.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				let images = []
				for (let i = 0; i < result.data.length; i++) {
					images[i] = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + result.data[i];
                }
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 

	// get Wiki summary API 
	$.ajax({
		url: "php/getWikiSummary.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				let value = Object.keys(result.data); 
				let summaryInit = result.data[value].extract;
				let summary = summaryInit.replaceAll('. ', '. <br><br>');
				$('#summary').html(summary); 
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 

	// get population, health and money info WolframAlpha API
	$.ajax({
		url: "php/getWolframAlpha.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				let pods = {};
				for (let i = 0; i < result.data.queryresult.pods.length; i++) {
					let title = result.data.queryresult.pods[i].title
					pods[title] = result.data.queryresult.pods[i];
                }
				
				let pop = pods.Demographics.subpods[0].plaintext
				console.log(pop)
				//pop = pop.replace('million people ', '');
				//pop = pop.replaceAll('world rank: ', '');
				let reg = /\s\(201[0-9]\sestimate\)\s/g;
				//pop = pop.replace(reg, '');
				let x = pop.split(reg);
				//x[1] = x[1].slice(21);
				let demo = []
				for (let i = 0; i < x.length; i++) {
					let index = x[i].indexOf('|');
					let str = x[i];
					let num = str.slice(index + 2, index + 6);
					console.log(num);
					index = x[i].indexOf(':');
					let rank = x[i].slice(index + 2, index + 6);	
					demo[i] = { num, rank };
                }
				console.log(demo);
				

				$('#pop').html(demo[0].num + 'M');
/*
 * 
 * Demographics.subpods[0].__proto__
				data.queryresult.pods[7].subpods[0].plaintext...data.queryresult.pods[7].title == demographics
		data.queryresult.pods[8].subpods[0].plaintext - Cultural properties(langiuages, ethnic mix, literacy)
		data.queryresult.pods[16].subpods[0].plaintext - Transport vehicles in use 
		17 education spending as gdp.  	18 health 
			19 development index, ranking. 

		
		data.queryresult.pods[11].subpods[0].plaintext - �1 = 1.4USD Currency
		data.queryresult.pods[12].subpods[0].plaintext - economic properties gdp
		13 employment
		14 business information - tax rates and new businesses */
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 

	// ipgeolocation astronomy API call for daylight info
	$.ajax({
		url: "php/getAstronomy.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				$('#sunrise').html(result.data.sunrise);
				$('#sunset').html(result.data.sunset);
				$('#daylight').html(result.data.day_length);
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 

	// OpenWeatherMap API call
	$.ajax({
		url: "php/getOpenWeather.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				if (result.data.cod == 404) {
					map.removeControl(weatherBox);
				} else {
					let temp = Math.round(result.data.main.temp);
					$('#wDesc').html(result.data.weather[0].description);
					$('#countryTemp').html(	 + '<sup>&#8451</sup>');
					$('#wBox').prepend('<img id="wImg" src="https://openweathermap.org/img/wn/' + result.data.weather[0].icon + '@2x.png">');
				}; 
			};
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 

	// OpenCage Forward call for country information
	$.ajax({
		url: "php/getOpenCageF.php",
		type: 'POST',
		dataType: 'json',
		data: {
			cc: this.value,
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				console.log(result)
				let dt = DateTime.fromObject({ zone: result.data[0].annotations.timezone.name })
				let localTime = dt.toLocaleString(DateTime.DATETIME_MED)
				let split = localTime.split(', ');
				$('#countryName').html(result.data[0].components.country);
				$('#callingCode').html('+' + result.data[0].annotations.callingcode);
				$('#localTime').html(split[2]);
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	});

	// Rest countries API call & nested currency conversion API call
	$.ajax({
		url: "php/getRest.php",
		type: 'POST',
		dataType: 'json',
		data: {
			cc: this.value,
		},
		success: function (result) {
			if (result.status.name == "ok") {
				// Rest countries outputs here 
				$('#capital').html(result.data.capital);
				$('#currencyName').html(result.data.currencies[0].name);
				$('#currencySymbol').html(result.data.currencies[0].symbol);
				$('#infoBox').prepend('<img id="flag" src="' + result.data.flag + '">');
				// Nested currency conversion API call 
				let currencyCode = result.data.currencies[0].code;
				$.ajax({
					url: "php/getConversion.php",
					type: 'POST',
					dataType: 'json',
					data: {
						cc: currencyCode,
					},
					success: function (result) {
						if (result.status.name == "ok") {
							$('#conversion').html(result.data.rates[currencyCode]);
						}
					},
					error: function (jqXHR, textStatus, errorThrown) {
						console.log(textStatus);
						}
				});  
			};
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	});

	// World geodata cities API and Wiki search API on popup click
	let cityArray = [];
	let citiesPromise = new Promise((resolve, reject) => {
		const settings = {
			"async": true,
			"crossDomain": true,
			"url": "https://world-geo-data.p.rapidapi.com/countries/" + this.value + "/cities?format=json&language=en&min_population=100000",
			"method": "GET",
			"headers": {
				"x-rapidapi-key": "6163ffc988msh241283aa44b8848p1ffaa1jsne4692527d1c3",
				"x-rapidapi-host": "world-geo-data.p.rapidapi.com"
			}
		};
		$.ajax(settings).done(function (response) {
			if (cityCluster) {
				map.removeLayer(cityCluster);
			}
			for (i = 0; i < response.cities.length; i++) {
				let pop = numberWithCommas(response.cities[i].population);
				// create city markers and put in array
				let content = $('<div id="wiki" />');
				content.html('<div id="wikiImg"/></div><b id="wikiURL">' + response.cities[i].name + '</b><br>Population: ' + pop);
				obj = L.marker([response.cities[i].latitude, response.cities[i].longitude], {
					icon: L.BeautifyIcon.icon({
						icon: 'fas fa-city',
						borderColor: 'rgba(255,255,255, 0.4)',
						backgroundColor: 'rgba(48, 131, 220, 1)',
						textColor: 'rgba(255,255,255, 1)'
					})
				})
				.bindPopup(content[0], {
					maxWidth: "300px"
				})
				.on('click', onCityClick);
				// Wiki API call on city popup click
				let encCities = encodeURIComponent(response.cities[i].name);
				function onCityClick(e) {
					$('#wikiImg').empty();
					$.ajax({
						url: "php/getWiki.php",
						type: 'POST',
						dataType: 'json',
						data: {
							q: encCities,
							title: encCities
						},
						success: function (result) {
							if (result.status.name == "ok") {
								$('#wikiURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
								if (result.data[0].thumbnailImg) {
									$('#wikiImg').prepend('<img id="cityImg" src="' + result.data[0].thumbnailImg + '" alt="City image" style="width:100%">');
									$('#cityImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
								};
							};
						},
						error: function (jqXHR, textStatus, errorThrown) {
							console.log(textStatus);
						}
					});
				}; 
				obj.bindPopup(content[0]);
				cityArray.push(obj);
			} 
			// creat cities cluster layer and put into easy button
			cities = new L.layerGroup(cityArray);
			cityCluster = L.markerClusterGroup({ showCoverageOnHover: false });
			cityCluster.addLayer(cities);
			cityCluster.addTo(map);
			addToBar(cityCluster, 'cityCluster');
			resolve('foo');
		});	
	});

	//  Geonames API search capital city and Wiki API search on popup click
	let capitalPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'PPLC',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					let pop = numberWithCommas(result.data[0].population);
					let content = $('<div id="cap" />');
					content.html(
						'<div id="capImgDiv"/></div><b id="capURL">' + result.data[0].name + '</b><br>Population: ' + pop);
					let capitalObj = L.marker([result.data[0].lat, result.data[0].lng], {
						icon: L.BeautifyIcon.icon({
							icon: 'fas fa-city',
							borderColor: 'rgba(255,255,255, 0.4)',
							backgroundColor: 'rgba(48, 131, 220, 1)',
							textColor: 'rgba(255,255,255, 1)'
						})
					})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
					let encCap = encodeURIComponent(result.data[0].name);
					function onCapitalClick(e) {
						$('#capImg').empty();
						$.ajax({
							url: "php/getWiki.php",
							type: 'POST',
							dataType: 'json',
							data: {
								q: encCap,
								title: encCap
							},
							success: function (result) {
								if (result.status.name == "ok") {
									if (result.data.length != 0) {
										$('#capURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
										if (result.data[0].thumbnailImg) {
											$('#capImgDiv').prepend('<img id="capImg" src="' + result.data[0].thumbnailImg + '" alt="Capital city image" style="width:100%">');
											$('#capImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
										}
									};
								};
							},
							error: function (jqXHR, textStatus, errorThrown) {
								console.log(textStatus);
							}
						});
					};
					capitalObj.addTo(map);
					addToBar(capitalObj, "capitalObj");
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// major airports json and Wiki airports info API on popup click
	if (airportCluster) {
		map.removeLayer(airportCluster);
	}
	let airportData = $.ajax({
		url: "php/getAirports.php",
		dataType: "json",
		async: false,
		data: {
			cc: this.value,
		},
	}).responseText;
	let airports = JSON.parse(airportData)
	let airportArray = [];
	for (let i = 0; i < airports.length; i++) {
		// create airport markers
		let coordArr = airports[i].coordinates.split(',');
		let content = $('<div id="airport" />');
		content.html(
			'<div id="logoImg"/></div><b id="airportURL">' + airports[i].name + '</b><span id="passengers"></span>');
		let obj = L.marker([coordArr[1], coordArr[0]], {
			icon: L.BeautifyIcon.icon({
				icon: 'fas fa-plane',
				borderColor: 'rgba(255,255,255, 0.4)',
				backgroundColor: 'rgba(78,65,135,1)',
				textColor: 'rgba(255,255,255, 1)'
			})
		})
		.bindPopup(content[0], {
			maxWidth: "300px"
		})
		.on('click', onAirportClick);
		// Airport details
		function onAirportClick(e) {
		const findAirportDetails = {
				"async": true,
				"crossDomain": true,
			"url": "https://wikiapi.p.rapidapi.com/api/v1/wiki/engineering/civil/airport/info/" + airports[i]['iata_code'] + "?lan=en",
				"method": "GET",
				"headers": {
					"x-rapidapi-key": "6163ffc988msh241283aa44b8848p1ffaa1jsne4692527d1c3",
					"x-rapidapi-host": "wikiapi.p.rapidapi.com"
				}
			};
		$.ajax(findAirportDetails).done(function (response) {
			$('#airportURL').wrap('<a href="https://' + response.website + '" target= _blank >');
			$('#passengers').html('<br>Passengers: ' + response.passengers);
			if (response.logo_img) {
				$('#logoImg').prepend('<img id="logoImg" src="' + response.logo_img + '" alt="airport logo" style="width:100%">');
				$('#logoImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
			}
		});
		} 
		airportArray.push(obj);
	}	
	let airportsLayer = new L.layerGroup(airportArray); 
	airportCluster = L.markerClusterGroup({ showCoverageOnHover: false });
	airportCluster.addLayer(airportsLayer);
	airportCluster.addTo(map);
	addToBar(airportCluster, 'airportCluster');

	// Geonames API search train stations and Wiki API search on popup click
	if (trainCluster) {
		map.removeLayer(trainCluster);
	}
	let trainArray = [];
	let trainPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'RSTN',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="train" />');
						content.html(
							'<div id="trainImgDiv"/></div><b id="trainURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-train',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(78,65,135,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
							.bindPopup(content[0], {
								maxWidth: "300px"
							})
							.on('click', onTrainClick)
						let encTrain = encodeURIComponent(result.data[i].name);
						function onTrainClick(e) {
							$('#trainImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encTrain,
									title: encTrain
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#trainURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#trainImgDiv').prepend('<img id="trainImg" src="' + result.data[0].thumbnailImg + '" alt="Train station image" style="width:100%">');
												$('#trainImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									};
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							});
						};
						trainArray.push(obj);
					};
					let trainLayer = new L.layerGroup(trainArray);
					trainCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					trainCluster.addLayer(trainLayer);
					addToBar(trainCluster, "trainCluster");
					trainCluster.addTo(map);
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search underground stations and Wiki API search on popup click
	if (metroCluster) {
		map.removeLayer(metroCluster);
	}
	let metroArray = [];
	let metroPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'MTRO',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="metro" />');
						content.html(
							'<div id="metroImgDiv"/></div><b id="metroURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-subway',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(78,65,135,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
							.bindPopup(content[0], {
								maxWidth: "300px"
							})
							.on('click', onMetroClick)
						let encMetro = encodeURIComponent(result.data[i].name);
						function onMetroClick(e) {
							$('#metroImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encMetro,
									title: encMetro
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#metroURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#metroImgDiv').prepend('<img id="metroImg" src="' + result.data[0].thumbnailImg + '" alt="Metro station image" style="width:100%">');
												$('#metroImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									};
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							});
						};
						metroArray.push(obj);
					};
					let metroLayer = new L.layerGroup(metroArray);
					metroCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					metroCluster.addLayer(metroLayer);
					addToBar(metroCluster, "metroCluster");
					metroCluster.addTo(map);
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search bus stations and Wiki API search on popup click
	if (busCluster) {
		map.removeLayer(busCluster);
	}
	let busArray = [];
	let busPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'BUSTN',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="bus" />');
						content.html(
							'<div id="busImgDiv"/></div><b id="busURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-bus-alt',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(78,65,135,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
							.bindPopup(content[0], {
								maxWidth: "300px"
							})
							.on('click', onBusClick)
						let encBus = encodeURIComponent(result.data[i].name);
						function onBusClick(e) {
							$('#busImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encBus,
									title: encBus
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#busURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#busImgDiv').prepend('<img id="busImg" src="' + result.data[0].thumbnailImg + '" alt="Bus station image" style="width:100%">');
												$('#busImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									};
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							});
						};
						busArray.push(obj);
					};
					let busLayer = new L.layerGroup(busArray);
					busCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					busCluster.addLayer(busLayer);
					addToBar(busCluster, "busCluster");
					busCluster.addTo(map);
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search libraries and Wiki API search on popup click 
	if (libCluster) {
		map.removeLayer(libCluster);
	}
	let libArray = [];
	let libPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'LIBR',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="libs" />');
						content.html(
							'<div id="libImgDiv"/></div><b id="libURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-book',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(243, 149, 30,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
						.on('click', onLibClick)
						let encLib = encodeURIComponent(result.data[i].name);
						function onLibClick(e) {
							$('#libImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encLib,
									title: encLib
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#libURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#libImgDiv').prepend('<img id="libImg" src="' + result.data[0].thumbnailImg + '" alt="Library image" style="width:100%">');
												$('#libImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px"});
											}
										};
											
									}
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							})
						};
						libArray.push(obj);
					}
					let libLayer = new L.layerGroup(libArray);
					libCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					libCluster.addLayer(libLayer);
					addToBar(libCluster, 'libCluster');
					libCluster.addTo(map);
					resolve('foo');
				}			
			},
			error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
			}
		}); 
	});

	// Geonames API search theatres and Wiki API search on popup click 
	if (thrCluster) {
		map.removeLayer(thrCluster);
	}
	let thrArray = [];
	let thrPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'THTR',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="thrs" />');
						content.html(
							'<div id="thrImgDiv"/></div><b id="thrURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-book',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(243, 149, 30,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
						.on('click', onThrClick)
						let encThr = encodeURIComponent(result.data[i].name);
						function onThrClick(e) {
							$('#thrImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encThr,
									title: encThr
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#thrURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#thrImgDiv').prepend('<img id="thrImg" src="' + result.data[0].thumbnailImg + '" alt="Theatre image" style="width:100%">');
												$('#thrImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};

									}
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							})
						};
						thrArray.push(obj);
					}
					let thrLayer = new L.layerGroup(thrArray);
					thrCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					thrCluster.addLayer(thrLayer);
					addToBar(thrCluster, 'thrCluster');
					thrCluster.addTo(map);
					resolve('foo');
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search hospitals and Wiki API search on popup click
	if (hospCluster) {
		map.removeLayer(hospCluster);
	}
	let hospArray = [];
	let hospPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value, 
				fc: 'HSP',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="hosp" />');
						content.html(
							'<div id="hospImgDiv"/></div><b id="hospURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-hospital-alt',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(191, 46, 73,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
						.on('click', onHospClick)
						let encHosp = encodeURIComponent(result.data[i].name);
						function onHospClick(e) {
							$('#HospImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encHosp,
									title: encHosp
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#hospURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#hospImgDiv').prepend('<img id="hospImg" src="' + result.data[0].thumbnailImg + '" alt="Hospital image" style="width:100%">');
												$('#hospImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									}
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							})
						};
						hospArray.push(obj);
					}
					let hospLayer = new L.layerGroup(hospArray);
					hospCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					hospCluster.addLayer(hospLayer);
					addToBar(hospCluster, 'hospCluster');
					hospCluster.addTo(map);
					resolve('foo');
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search museums and Wiki API search on popup click 
	if (musCluster) {
		map.removeLayer(musCluster);
	}
	let musArray = [];
	let musPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'MUS',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="mus" />');
						content.html(
							'<div id="musImgDiv"/></div><b id="musURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-landmark',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(243, 149, 30,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
						.on('click', onMusClick)
						let encMus = encodeURIComponent(result.data[i].name);
						function onMusClick(e) {
							$('#musImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encMus,
									title: encMus
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#musURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#musImgDiv').prepend('<img id="musImg" src="' + result.data[0].thumbnailImg + '" alt="Museum image" style="width:100%">');
												$('#musImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									}
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							})
						};
						musArray.push(obj);
					}
					let musLayer = new L.layerGroup(musArray);
					musCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					musCluster.addLayer(musLayer);
					addToBar(musCluster, 'musCluster');
					musCluster.addTo(map);
					resolve('foo');
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search universiities and Wiki API search on popup click
	if (uniCluster) {
		map.removeLayer(uniCluster);
	}
	let uniArray = [];
	let uniPromise = new Promise((resolve, reject) => {
		$.ajax({
			url: "php/getAmenities.php",
			type: 'POST',
			dataType: 'json',
			data: {
				q: encCountryKey,
				cc: this.value,
				fc: 'UNIV',
			},
			success: function (result) {
				if (result.status.name == "ok") {
					for (let i = 0; i < result.data.length; i++) {
						let content = $('<div id="mus" />');
						content.html(
							'<div id="uniImgDiv"/></div><b id="uniURL">' + result.data[i].name);
						let obj = L.marker([result.data[i].lat, result.data[i].lng], {
							icon: L.BeautifyIcon.icon({
								icon: 'fas fa-school',
								borderColor: 'rgba(255,255,255, 0.4)',
								backgroundColor: 'rgba(243, 149, 30,1)',
								textColor: 'rgba(255,255,255, 1)'
							})
						})
						.bindPopup(content[0], {
							maxWidth: "300px"
						})
						.on('click', onUniClick)
						let encUni = encodeURIComponent(result.data[i].name);
						function onUniClick(e) {
							$('#uniImg').empty();
							$.ajax({
								url: "php/getWiki.php",
								type: 'POST',
								dataType: 'json',
								data: {
									q: encUni,
									title: encUni
								},
								success: function (result) {
									if (result.status.name == "ok") {
										if (result.data.length != 0) {
											$('#uniURL').wrap('<a href="https://' + result.data[0].wikipediaUrl + '" target= _blank >');
											if (result.data[0].thumbnailImg) {
												$('#uniImgDiv').prepend('<img id="uniImg" src="' + result.data[0].thumbnailImg + '" alt="University image" style="width:100%">');
												$('#uniImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", "border": "1px solid lightgrey", "margin-bottom": "5px", "border-radius": "4px" });
											}
										};
									};
								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log(textStatus);
								}
							});
						};
						uniArray.push(obj);
					};
					let uniLayer = new L.layerGroup(uniArray);
					uniCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					uniCluster.addLayer(uniLayer);
					addToBar(uniCluster, "uniCluster");
					uniCluster.addTo(map);
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// function to add buttons to array (escape scope)
	function addToBar(x, y) {
		toggleArray[y] = x;
	}

	// once all buttons completed, add to a bar and display on map
	Promise.all([libPromise, citiesPromise, hospPromise, musPromise, thrPromise, uniPromise, capitalPromise, trainPromise, metroPromise, busPromise]).then((values) => {
		let overlayMaps = {
			"<span class='city-layer-item'>Capital city</span>": toggleArray['capitalObj'],
			"Major cities": toggleArray['cityCluster'],	
			"Hospitals": toggleArray['hospCluster'], 
			"Univerisities": toggleArray['uniCluster'],
			"Libraries": toggleArray['libCluster'],
			"Museums": toggleArray['musCluster'],
			"Theatres": toggleArray['thrCluster'],
			"<span class='transport-layer-item'>Airports</span>": toggleArray['airportCluster'],
			"Train stations": toggleArray['trainCluster'],
			"Metro stations": toggleArray['metroCluster'],
			"Bus stations": toggleArray['busCluster'],
			"<span class='clouds-layer-item'>Clouds</span>": clouds,
			"Rain": rain,
			"Snow": snow,
		};
		let overlays = L.control.layers({}, overlayMaps).addTo(map);
		$('.city-layer-item').parent().parent().prepend('<b>Places:</b><br>');
		$('.transport-layer-item').parent().parent().prepend('<b>Transport:</b><br>');
		$('.clouds-layer-item').parent().parent().prepend('<b>Weather:</b><br>')
		$('#spinner').hide();
	});	

});

// create a div to hold all the checkboxes for layers. on click it turns into a bigger fixed size div... just like ore try to amend html of leaflet-control-layers-expanded




/*   
 *   
 *   
 *   
let selectBox = L.control({ position: 'tophorizontalcenter' });
selectBox.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'selectBox');
	this.update();
	return this._div;
};
selectBox.update = function (x) {
	this._div.innerHTML = '<select id="country-select" name="country"><option selected value="">Pick a country</option></select></p >'
};
selectBox.addTo(map); */
// {"<img src='my-layer-icon' />  myLayer}