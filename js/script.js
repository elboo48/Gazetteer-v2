// alias Luxon DateTime
let DateTime = luxon.DateTime;

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

// leaflet tile trail layers 
let hikingLayer = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});
let cyclingLayer = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

// legend for trail layers
let trailLegend = L.control({ position: 'bottomleft' });
trailLegend.onAdd = function (map) {
	let div = L.DomUtil.create('div', 'owm-legend-container routeslegend leaflet-control');
	div.innerHTML +=
		'<div class="owm-legend-item" style="float: left;">' +
		'<img src="css/images/routeslegend4.png" alt="legend">' + '</div>';
	return div;
};

// functions to push up/down bottom left legends depending on size of window to avoid overlap with attribution on bottom right 
function leg_bottom_adjust() {
	let w = parseInt(window.innerWidth);
	if (w <= 490) {
		$(".leaflet-bottom.leaflet-left").css({ "bottom": "17px" });
	} else if (w > 490 && w <= 730) {
		$(".leaflet-bottom.leaflet-left").css({ "bottom": "5px" });
	} else {
		$(".leaflet-bottom.leaflet-left").css({ "bottom": "0" });
	}
};
function leg_bottom_undo() {
	let w = parseInt(window.innerWidth);
	if (w <= 307) {
		$(".leaflet-bottom.leaflet-left").css({ "bottom": "5px" });
	} else if (w > 307) {
		$(".leaflet-bottom.leaflet-left").css({ "bottom": "0" });
	}
};

// create buttons for trail layers
let hikingToggle = L.easyButton({
	id: 'marker-toggle-hiking',
	states: [{
		stateName: 'add-layer',
		icon: 'fas fa-hiking',
		title: 'Add hiking trails',
		onClick: function (control) {
			map.addLayer(hikingLayer);
			trailLegend.addTo(map);
			leg_bottom_adjust()
			control.state('remove-layer');
		}
	}, {
		stateName: 'remove-layer',
		title: 'Remove hiking trails',
		icon: 'fas fa-undo-alt',
		onClick: function (control) {
			map.removeLayer(hikingLayer);
			if ($('#marker-toggle-cycling').attr("title") == 'Add bike trails') {
				map.removeControl(trailLegend)
			}
			control.state('add-layer');
			if (!$('#temp').is(':checked') && !$('#rain').is(':checked') && !$('#clouds').is(':checked')) {
					if ($('#marker-toggle-cycling').attr("title") == 'Add bike trails') {
					leg_bottom_undo()
					}
			}
		}
	}]
});
let cyclingToggle = L.easyButton({
	id: 'marker-toggle-cycling',
	states: [{
		stateName: 'add-layer',
		icon: 'fas fa-biking',
		title: 'Add bike trails',
		onClick: function (control) {
			map.addLayer(cyclingLayer);
			trailLegend.addTo(map);
			leg_bottom_adjust()
			control.state('remove-layer');
		}
	}, {
		stateName: 'remove-layer',
		title: 'Remove bike trails',
		icon: 'fas fa-undo-alt',
			onClick: function (control) {
				map.removeLayer(cyclingLayer);
				if ($('#marker-toggle-hiking').attr("title") == 'Add hiking trails') {
					map.removeControl(trailLegend);
				}
				control.state('add-layer');
				if (!$('#temp').is(':checked') && !$('#rain').is(':checked') && !$('#clouds').is(':checked')) {
					if ($('#marker-toggle-hiking').attr("title") == 'Add hiking trails') {
						leg_bottom_undo()
					}
				}
			}
	}]
});
let trailsArr = [hikingToggle,
	cyclingToggle];

// initialise map
let map = L.map('mapid', {
	attributionControl: false
}).addLayer(blueMap).setView([55.505, 5.09], 4);

// initialise attribution 
L.control.attribution({
	position: 'bottomright'
}).addTo(map);

// add basemaps control
map.addControl(L.control.basemaps({
	basemaps: basemaps,
	tileX: 4,  // tile X coordinate
	tileY: 2,  // tile Y coordinate
	tileZ: 3   // tile zoom level
}));

// Create additional control placeholder for title and select bar
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
	this._div.innerHTML = '<p>Where will you explore today?  <select id="country-select" name="country"><option selected value="">Pick a country</option></select></p >'
};
selectBox.addTo(map);

// create weather tile layers
let clouds = L.OWM.clouds({ showLegend: false, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' }); 
let rain = L.OWM.rain({ showLegend: false, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' });
let temp = L.OWM.temperature({ showLegend: true, opacity: 0.5, appId: '1d748ca6a042143ce4ca0a612a95acf5' });

// create select button and populate from json file
let jsonData = $.ajax({
    url: "php/getBorders.php",
    dataType: "json",
    async: false
}).responseText;
let jArr = JSON.parse(jsonData);
let featureObj = {};
for (let i = 0; i < jArr.features.length; i++) {
	let key =  jArr.features[i].properties.name;
	let value = jArr.features[i].properties.iso_a2; 
	featureObj[key] = value; 
}
const ordered = Object.keys(featureObj).sort().reduce(
    (obj, key) => {
        obj[key] = featureObj[key];
        return obj;
    }, {}
);
let ele = document.getElementById('country-select');
for (const [key, value] of Object.entries(ordered)) {
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

// select event leading to API calls and map shift
$('#country-select').on('change', function () {

	// remove previous select event
	$('.leaflet-interactive.remove-markers-active').click();
	$('path.leaflet-interactive').remove();
	$('.leaflet-pane.leaflet-marker-pane').empty();
	$('.info.leaflet-control').remove();
	$('.weatherBox.leaflet-control').remove();
	$('#cities-marker-toggle').parent().remove();
	$('#airports-marker-toggle').parent().remove();
	$('#lib-marker-toggle').parent().remove();
	let toggleArray = [];

	// map draw boundary and shuffle using bounds
	for (let i = 0; i < jArr.features.length; i++) {
		if (jArr.features[i].properties.iso_a2 === this.value) {
			let countryBoundary = jArr.features[i].geometry;
			let bounds = new L.geoJSON(countryBoundary, {
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
		};
	};

	// draw country information box and populate
	let info = L.control({ position: 'topleft' });
	info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
		};
	info.update = function (x) {
		this._div.innerHTML = '<details id="infoDeets"><summary><div id="infoBox"></div></summary>' + 
			'<strong><span id="countryName"></span>:</strong>' + 
			'<span id="pop"></span>' +
			'<br>Capital city: ' + '<span id="capital"></span>' +
			'<br>Calling code: +' + '<span id="callingCode"></span>' +
			'<br>Currency: ' + '<span id="currencyName"></span>&nbsp<span id="currencySymbol"></span>' +
			'<br>Value to 1 USD: ' + '<span id="conversion"></span>' + 
			'<br>Local time: ' + '<span id="localTime"></span>' + '</details>'	
			};	
	info.addTo(map);

	// amend country information box css on click based on window height
	$('#infoBox').click(function (event) {
		let h = parseInt(window.innerHeight);
		if (h > 550) {
			isOpen = ($("#infoDeets").attr("open") == "open");
			if (isOpen == false) {
				$('#flag').css({ "position": "relative" });
				$('#infoBox').css({ "text-align": "center", "background-color":"inherit"});
			} else if (isOpen == true) {
				$('#flag').css({ "position": "absolute", "top": "0", "bottom": "0", "margin": "auto" });
				$('#infoBox').css({ "postion": "relative", "text-align": "unset", "backgroundColor": "#D5E8EB" });
			};
		};
	});

	// draw weather box and populate
	let weatherBox = L.control({ position: 'topleft' });
	weatherBox.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'weatherBox');
		this.update();
		return this._div;
	};
	weatherBox.update = function (x) {
		this._div.innerHTML = '<details><summary><div id="wBox"></div><span id="countryTemp"></span></summary>' +
			'<strong>Weather&nbspforcast:&nbsp</strong>' +
			'<br>Outlook: <span id="wDesc"></span>' +
			'<br>Sunrise:&nbsp<span id="sunrise"></span>am' +
			'<br>Sunset: <span id="sunset"></span>pm' + 
			'<br>Total daylight hours: <span id="daylight"></span>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp' +
			'<br><strong>View on map: </strong>' +
			'<br><input type="checkbox" id="clouds"><label for="clouds">&nbspClouds</label><br>' +
			'<input type="checkbox" id="rain"><label for="rain">&nbspRain</label><br>' +
			'<input type="checkbox" id="temp"><label for="temp">&nbspTemperature</label>' +
			'</details>'
	};
	weatherBox.addTo(map);

	// close one information box when other opens
	$('details').click(function (event) {
		$('details').not(this).removeAttr("open");
	});

	// add function to weather checkboxes and call legend adjust functions to avoid attribution overlap on small devices
	$('#clouds').change(function () {
		if ($(this).is(':checked')) {
			clouds.addTo(map);
			leg_bottom_adjust(); 
		} else {
			map.removeLayer(clouds);
			if (!$('#rain').is(':checked') && !$('#temp').is(':checked')) {
				if ($('#marker-toggle-cycling').attr("title") == 'Add bike trails' && $('#marker-toggle-hiking').attr("title") == 'Add hiking trails') 
				{ leg_bottom_undo() }
			};
		};
	});
	$('#rain').change(function () {
		if ($(this).is(':checked')) {
			rain.addTo(map);
			leg_bottom_adjust()
		} else {
			map.removeLayer(rain);
			if (!$('#clouds').is(':checked') && !$('#temp').is(':checked')) {
				if ($('#marker-toggle-cycling').attr("title") == 'Add bike trails' && $('#marker-toggle-hiking').attr("title") == 'Add hiking trails')
				{ leg_bottom_undo() }
			};	
		};
	});
	$('#temp').change(function () {
		if ($(this).is(':checked')) {
			temp.addTo(map);
			leg_bottom_adjust(); 

		} else {
			map.removeLayer(temp);
			if (!$('#rain').is(':checked') && !$('#clouds').is(':checked')) {
				if ($('#marker-toggle-cycling').attr("title") == 'Add bike trails' && $('#marker-toggle-hiking').attr("title") == 'Add hiking trails')
				{ leg_bottom_undo() }
			};
		};
	});

	// get select key data for API call
	function getKeyByValue(object, value) {
		return Object.keys(object).find(key =>
			object[key] === value);
	}
	countryKey = getKeyByValue(ordered, this.value);
	let encCountryKey = encodeURIComponent(countryKey)

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
					$('#countryTemp').html(temp + '<sup>&#8451</sup>');
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
				let dt = DateTime.fromObject({ zone: result.data[0].annotations.timezone.name })
				let localTime = dt.toLocaleString(DateTime.DATETIME_MED)
				$('#countryName').html(result.data[0].components.country);
				$('#callingCode').html(result.data[0].annotations.callingcode);
				$('#localTime').html(localTime);
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
				$('#pop').html('<br>Population: ' + result.data.population);
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
			for (i = 0; i < response.cities.length; i++) {
				// create city markers and put in array
				let content = $('<div id="wiki" />');
				content.html('<div id="wikiImg"/></div><b id="wikiURL">' + response.cities[i].name + '</b><br>Population: ' + response.cities[i].population);
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
									$('#cityImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
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
			let cities = new L.layerGroup(cityArray);
			let cityCluster = L.markerClusterGroup({ showCoverageOnHover: false });
			cityCluster.addLayer(cities);
			let citiesToggle = L.easyButton({
				id: 'cities-marker-toggle',
				states: [{
					stateName: 'add-markers',
					icon: 'fas fa-city',
					title: 'Add cities',
					onClick: function (control) {
						map.addLayer(cityCluster);
						control.state('remove-markers');
					}
				}, {
					stateName: 'remove-markers',
					title: 'Remove cities',
					icon: 'fas fa-undo-alt',
					onClick: function (control) {
						map.removeLayer(cityCluster);
						control.state('add-markers');
					}
				}]
			});
			addToBar(citiesToggle);
			resolve('foo');
		});	
	});

	// major airports json and Wiki airports info API on popup click
	let airportData = $.ajax({
		url: "php/getAirports.php",
		dataType: "json",
		async: false
	}).responseText;
	let airports = JSON.parse(airportData)
	let airportArray = [];
	for (let i = 0; i < airports.length; i++) {
		if (airports[i].iso_country == this.value) {
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
			.on('click', onAirportClick)
			// Airport details
			function onAirportClick(e) {
			const findAirportDetails = {
					"async": true,
					"crossDomain": true,
				"url": "https://wikiapi.p.rapidapi.com/API/v1/wiki/engineering/civil/airport/info/" + airports[i]['iata_code'] + "?lan=en",
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
						$('#logoImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
					}
				});
				} 
			airportArray.push(obj);
		}	
	}
	let airportsLayer = new L.layerGroup(airportArray); 
	let airportCluster = L.markerClusterGroup({ showCoverageOnHover: false });
	airportCluster.addLayer(airportsLayer);
	airportsToggle = L.easyButton({
		id: 'airports-marker-toggle',
		states: [{
			stateName: 'add-markers',
			icon: 'fas fa-plane',
			title: 'Add airports',
			onClick: function (control) {
					map.addLayer(airportCluster);
					control.state('remove-markers');
				}
		}, {
			stateName: 'remove-markers',
			title: 'Remove airports',
			icon: 'fas fa-undo-alt',
			onClick: function (control) {
					map.removeLayer(airportCluster);
					control.state('add-markers');
				}
			}]
		}); 
	toggleArray.push(airportsToggle); 

	// Geonames API search libraries and Wiki API search on popup click 
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
								backgroundColor: 'rgba(46, 191, 165,1)',
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
												$('#libImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
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
					let libCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					libCluster.addLayer(libLayer);
					libToggle = L.easyButton({
					id: 'lib-marker-toggle',
					states: [{
						stateName: 'add-markers',
						icon: 'fas fa-book',
						title: 'Add libraries',
						onClick: function (control) {
							map.addLayer(libCluster);
							control.state('remove-markers');
						}
					}, {
						stateName: 'remove-markers',
						title: 'Remove libraries',
						icon: 'fas fa-undo-alt',
						onClick: function (control) {
							map.removeLayer(libCluster);
							control.state('add-markers');
						}
							}]
					});
					addToBar(libToggle);
					resolve('foo');
				}			
			},
			error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
			}
		}); 
	});

	// Geonames API search hospitals and Wiki API search on popup click
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
												$('#hospImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
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
					let hospCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					hospCluster.addLayer(hospLayer);
					hospToggle = L.easyButton({
						id: 'hosp-marker-toggle',
						states: [{
							stateName: 'add-markers',
							icon: 'fas fa-hospital-alt',
							title: 'Add hospitals',
							onClick: function (control) {
								map.addLayer(hospCluster);
								control.state('remove-markers');
							}
						}, {
							stateName: 'remove-markers',
							title: 'Remove hospitals',
							icon: 'fas fa-undo-alt',
							onClick: function (control) {
								map.removeLayer(hospCluster);
								control.state('add-markers');
							}
						}]
					});
					addToBar(hospToggle);
					resolve('foo');
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search museums and Wiki API search on popup click 
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
												$('#musImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
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
					let musCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					musCluster.addLayer(musLayer);
					musToggle = L.easyButton({
						id: 'mus-marker-toggle',
						states: [{
							stateName: 'add-markers',
							icon: 'fas fa-landmark',
							title: 'Add museums',
							onClick: function (control) {
								map.addLayer(musCluster);
								control.state('remove-markers');
							}
						}, {
							stateName: 'remove-markers',
							title: 'Remove museums',
							icon: 'fas fa-undo-alt',
							onClick: function (control) {
								map.removeLayer(musCluster);
								control.state('add-markers');
							}
						}]
					});
					addToBar(musToggle);
					resolve('foo');
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// Geonames API search universiities and Wiki API search on popup click
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
								backgroundColor: 'rgba(249, 224, 0,1)',
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
												$('#uniImg').css({ "display": "block", "opacity": "1", "object-fit": "cover", });
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
					let uniCluster = L.markerClusterGroup({ showCoverageOnHover: false });
					uniCluster.addLayer(uniLayer);
					uniToggle = L.easyButton({
						id: 'uni-marker-toggle',
						states: [{
							stateName: 'add-markers',
							icon: 'fas fa-school',
							title: 'Add universities',
							onClick: function (control) {
								map.addLayer(uniCluster);
								control.state('remove-markers');
							}
						}, {
							stateName: 'remove-markers',
							title: 'Remove universities',
							icon: 'fas fa-undo-alt',
							onClick: function (control) {
								map.removeLayer(uniCluster);
								control.state('add-markers');
							}
						}]
					});
					addToBar(uniToggle);
					resolve('foo');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	// function to add buttons to array (escape scope)
	function addToBar(x) {
		toggleArray.push(x);
	}

	// once all buttons completed, add to a bar and display on map
	Promise.all([libPromise, citiesPromise, hospPromise, musPromise, uniPromise]).then((values) => {
		let bar = trailsArr.concat(toggleArray);
		let selectBar = L.easyBar(bar);
		selectBar.addTo(map);		
	});	
});
