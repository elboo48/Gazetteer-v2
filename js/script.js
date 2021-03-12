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
	let done = false;
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
	// DO WITH REST
	$('#pop').empty();  
		let toggleArray = [];

	// get select key data for API calls
	function getKeyByValue(object, value) {
		return Object.keys(object).find(key =>
			object[key] === value);
	}
	countryKey = getKeyByValue(jArr, this.value);
	let encCountryKey = encodeURIComponent(countryKey)
	
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
		$('#spinner').show();
		// get news about country for news modal 
		const settings = {
			"async": true,
			"crossDomain": true,
			"url": "https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/search/NewsSearchAPI?q=" + encCountryKey + "&pageNumber=1&pageSize=10&autoCorrect=true&withThumbnails=true&fromPublishedDate=null&toPublishedDate=null",
			"method": "GET",
			"headers": {
				"x-rapidapi-key": "6163ffc988msh241283aa44b8848p1ffaa1jsne4692527d1c3",
				"x-rapidapi-host": "contextualwebsearch-websearch-v1.p.rapidapi.com"
			}
		};
		$.ajax(settings).done(function (response) {
			$('#spinner').hide();
			for (let i = 0; i < response.value.length; i++) {
				$('#newsCard' + [i]).show();
				$('#nIconDiv' + [i]).empty();
				let bool = response.value[i].provider.name.includes('job');
				if (!bool) {
					date = response.value[i].datePublished.substring(5, 10);
					let day = date.slice(-2);
					let month = date.slice(0, 2);
					date = day + '/' + month
					let story = response.value[i].body;
					let reg = /\r?\n/g
					story = story.replaceAll(reg, '<br><br>')
					$('#nIconDiv' + [i]).append('<img alt="news Image" src="' + response.value[i].image.thumbnail + '" style="max-width: 150px">');
					$('#nTitle' + [i]).html(response.value[i].title);
					$('#nDesc' + [i]).html(response.value[i].description)
					$('#nSource' + [i]).html('<a href="' + response.value[i].url + '" target="_blank">' + response.value[i].provider.name + '</a>');
					$('#nStory' + [i]).html(story);
					$('#nDate' + [i]).html(date);
				}
				else {
					$('#newsCard' + [i]).hide();
                }
            }
		});

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
	
	// launch country modal on click 
	$('.info').click(function (event) {
		$('#countryModal').modal('toggle');
		if (!done) {
			$('#spinner').show();
		};
	});

	// launch finance modal on click 
	$('.finance').click(function (event) {
		$('#financeModal').modal('toggle');
		if (!done) {
			$('#spinner').show();
		};
	});

	// OpenCage Forward call for country information for country info modal
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
				let split = localTime.split(', ');
				$('#countryName').html(result.data[0].components.country);
				$('#localTime').html(split[2]);
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	});

	// Rest countries API call for currency info for finance modal
	let lat;
	let lng;
	let latLngPromise = new Promise((resolve, reject) => {
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
					lat = result.data.latlng[0];
					lng = result.data.latlng[1];
					resolve('foo');
					$('#capital').html(result.data.capital);
					$('#currencyName').html('1 ' + result.data.currencies[0].name);
					$('#currencySymbol').html(result.data.currencies[0].symbol);
					$('#infoBox').prepend('<img id="flag" src="' + result.data.flag + '">');
				};
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	});

	console.log(encCountryKey)

	// get Wiki images for country info modal
	$.ajax({
		url: "php/getWikiImages.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				$('#carouselSlides').empty();
				let imageUrls = [];
				let num = Object.keys(result.data.query.pages);
				num = num[0]
				let data = result.data.query.pages[num]
				for (let i = 0; i < data.images.length; i++) {
					let title = data.images[i].title;
					if (!title.includes('.svg') && !title.includes('.png') && !title.includes('.ogg')) {
						title = title.replace('File:', '');
						title = title.replaceAll(' ', '_');
						imageUrls.push(title);
					}
				}
				for (let i = 0; i < imageUrls.length; i++) {
					let image = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + imageUrls[i];
					if (i == 0) {
						$('#carouselSlides').append('<div id="item' + i + '"class= "carousel-item active" ><img class="d-block w-100" src="' + image + '" alt="Image"> </div>');
					}
					else {
						$('#carouselSlides').append('<div id="item' + i + '"class= "carousel-item" ><img class="d-block w-100" src="' + image + '" alt="Image"  > </div>');
					}
					let encImage = encodeURIComponent(imageUrls[i]);
					$.ajax({
						url: "php/getWikiCaption.php",
						type: 'POST',
						dataType: 'json',
						data: {
							q: encImage
						},
						success: function (result) {
							if (result.status.name == "ok") {
								let num = Object.keys(result.data);
								let longDesc = result.data[num].imageinfo[0].extmetadata.ImageDescription.value
								let x = '#item' + i;
								$(x).append('<figcaption >' + longDesc + '</figcaption><br>');
							}
						},
						error: function (jqXHR, textStatus, errorThrown) {
							let errorMessage = jqXHR.status + ': ' + jqXHR.statusText
								console.log('Error - ' + errorMessage);
						
						}
					}); 
				}
				
			}
		},
		error: function (jqXHR, textStatus, errorThrown) {
			let errorMessage = jqXHR.status + ': ' + jqXHR.statusText + ': ' + jqXHR.responseText 
			console.log('Error - ' + errorMessage);

		}
	}); 

	// get Wiki summary API for country info modal
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

	// get government info WikiApi for country info modal
	let lowerCountry = countryKey.toLowerCase();
	lowerCountry = lowerCountry.replaceAll(' ', '_');
	lowerCountry = lowerCountry.replaceAll('-', '_')
	switch (lowerCountry) {
		case 'united_kingdom':
			lowerCountry = 'uk';
			break;
		case 'united_arab_emirates':
			lowerCountry = 'uae';
			break;
		case 'congo':
			lowerCountry = 'democratic_republic_of_the_congo';
			break;
		case "côte_d'ivoire":
			lowerCountry = 'cote_d_ivoire';
			break;
		case 'swaziland':
			lowerCountry = 'eswatini'
			break;

		default:
			break;
	}
	$('#govCard').show();
	const settings = {
		"async": true,
		"crossDomain": true,
		"url": "https://wikiapi.p.rapidapi.com/api/v1/wiki/geography/country/info/" + lowerCountry + "?lan=en",
		"method": "GET",
		"headers": {
			"x-rapidapi-key": "6163ffc988msh241283aa44b8848p1ffaa1jsne4692527d1c3",
			"x-rapidapi-host": "wikiapi.p.rapidapi.com"
		}
	};
	$.ajax(settings).done(function (response) {
		// country info modal, government card
		if (response.government) {
			$('#govRow').show();
			if (response.government.includes('parliamentaryconstitutional')) {
				let gov = response.government.replace('parliamentaryconstitutional', 'parliamentary constitutional ');
				$('#gov').html(gov);
			}
			else {
				$('#gov').html(response.government)
			}	
		}
		else {
			$('#govRow').hide();
        }
		if (response.Monarch) {
			$('#monarchRow').show();
			$('#monarch').html(response.Monarch)
		}
		else {
			$('#monarchRow').hide();
		}
		if (response.president) {
			$('#presidentRow').show();
			$('#president').html(response.president)
		}
		else {
			$('#presidentRow').hide();
		}
		if (response['prime_minister']) {
			$('#pmRow').show();
			$('#pm').html(response['prime_minister'])
		}
		else {
			$('#pmRow').hide();
		}
		if (response['vice_president']) {
			$('#vpRow').show();
			$('#vp').html(response['vice_president'])
		}
		else {
			$('#vpRow').hide();
		}
		if (response.legislature) {
			$('#legislatureRow').show();
			$('#legislature').html(response.legislature)
		}
		else {
			$('#legislatureRow').hide();
		}
		if (response['lower_house']) {
			$('#lHouseRow').show();
			$('#lHouse').html(response['lower_house'])
		}
		else {
			$('#lHouseRow').hide();
		}
		if (response['upper_house']) {
			$('#uHouseRow').show();
			$('#uHouse').html(response['upper_house'])
		}
		else {
			$('#uHouseRow').hide();
		}
	}).fail(function () {
		$('#govCard').hide();
	});

	// get population, health and finance info WolframAlpha API for country info modal and finance modal
	$.ajax({
		url: "php/getWolframAlpha.php",
		type: 'POST',
		dataType: 'json',
		data: {
			q: encCountryKey
		},
		success: function (result) {
			if (result.status.name == "ok") {
				done = true; 
				$('#spinner').hide();
				let pods = {};
				for (let i = 0; i < result.data.queryresult.pods.length; i++) {
					let title = result.data.queryresult.pods[i].title
					pods[title] = result.data.queryresult.pods[i];
				}
			// Country info modal
				//population data
				$('#popCard').show();
				if (pods['Demographics'] != undefined) {
					let demo = []
					let pop = pods.Demographics.subpods[0].plaintext
					if (pop.includes('Gaza')) {
						let gazaSplit = pop.split('|');
						for (let i = 0; i < gazaSplit.length; i++) {
							let num = gazaSplit[i].slice(1, 5);
							num = parseFloat(num);
							demo[i] = num
						}
						let population = demo[3] + demo[4];
						$('#pop').html(population + ' M');
						let density = demo[5] + demo[6];
						density = numberWithCommas(density);
						let growth = demo[7] + demo[8];
						let life = demo[9] + demo[10];
						$('#popDen').html(density + ' people/mile<sup>2</sup>');
						$('#popInc').html(growth + ' %/year');
						$('#lifeExp').html(life + ' years');
					}
					else {
						let reg = /\s\(201[0-9]\sestimate\)\s/g;
						let x = pop.split(reg);
						for (let i = 0; i < x.length; i++) {
							let index = x[i].indexOf('|');
							let str = x[i];
							let num = str.slice(index + 2, index + 6);
							index = x[i].indexOf(':');
							let rank = x[i].slice(index + 2, index + 6);
							demo[i] = { num, rank };
							};
						if (x[0].includes('million')) {
							let a = parseFloat(demo[0].num);
							$('#pop').html(a + ' M');
						}
						else if (x[0].includes('billion')) {
							let a = parseFloat(demo[0].num);
							$('#pop').html(a + ' B');
						}
						else {
							let index = x[0].indexOf('|');
							let n = x[0].slice(index + 2, index + 8);
							n = parseFloat(n)
							popNumber = numberWithCommas(n);
							$('#pop').html(popNumber);
						}
						let popDen = parseInt(demo[1].num)
						popDen = numberWithCommas(popDen)
						$('#popDen').html(popDen + ' people/mile<sup>2</sup>');
						$('#popInc').html(demo[2].num + ' %/year');
						$('#lifeExp').html(demo[3].num + ' years');
					}
				}
				else {
					$('#popCard').hide();
                }
				// health data
				$('#healthCard').show();
				$('#healthRow').show();
				$('#bedsRow').show();
				$('#docsRow').show();
				$('#healthRankRow').show();
				if (pods['Health care'] != undefined) {
					let health = pods['Health care'].subpods[0].plaintext
					let y = health.split('| ');
					let healthNums = [];
					function fixSpend(x) {
						x = x.substring(1);
						x = parseInt(x);
						x = numberWithCommas(x);
						return x;
                    }
					if (y.length == 4) {
						for (let i = 0; i < y.length; i++) {
							let index = y[i].indexOf(' ');
							let str = y[i];
							let num = str.slice(0, index);
							healthNums[i] = num;
						}
						let healthSpend = fixSpend(healthNums[1])	
						$('#healthSpending').html('$' + healthSpend + ' person/year');
						$('#doctors').html(healthNums[2] + ' per 1,000 people');
						$('#beds').html(healthNums[3] + ' per 1,000 people');
					}
					else if (y.length == 3) {
						if (y[0] == 'health spending ' && y[1].includes('physicians')) {
							for (let i = 0; i < y.length; i++) {
								let index = y[i].indexOf(' ');
								let str = y[i];
								let num = str.slice(0, index);
								healthNums[i] = num;
							}
							let healthSpend = fixSpend(healthNums[1])	
							$('#healthSpending').html('$' + healthSpend + ' person/year');
							$('#doctors').html(healthNums[2] + ' per 1,000 people');
							$('#bedRow').hide();						
						}
						else if (y[0] == 'health spending ' && y[1].includes('beds')) {
							for (let i = 0; i < y.length; i++) {
								let index = y[i].indexOf(' ');
								let str = y[i];
								let num = str.slice(0, index);
								healthNums[i] = num;
							}
							let healthSpend = fixSpend(healthNums[1])					
							$('#healthSpending').html('$' + healthSpend + ' person/year');
							$('#beds').html(healthNums[2] + ' per 1,000 people');
							$('#docRow').hide();
						}
						else {
							for (let i = 0; i < y.length; i++) {
								let index = y[i].indexOf(' ');
								let str = y[i];
								let num = str.slice(0, index);
								healthNums[i] = num;
							}
							$('#doctors').html(healthNums[1] + ' per 1,000 people');
							$('#beds').html(healthNums[2] + ' per 1,000 people');
							$('#healthRow').hide();
						}
					}
					if (pods['UN Human Development Index'] != undefined) {
						let healthUN = pods['UN Human Development Index'].subpods[0].plaintext;
						let index = healthUN.indexOf(': ');
						let healthRank = healthUN.slice(index + 2, index + 7);
						if (healthRank.includes(')')) {
							healthRank = healthRank.replace(')', '');
						}
						$('#healthRank').html(healthRank);
					} else {
						$('#healthRankRow').hide();
                    }
				}
				else {
					$('#healthCard').hide();
				}
				// education data
				$('#eduCard').show();
				$('#eduSpendRow').show();
				$('#studentsRow').show();
				$('#teachersRow').show();
				$('#eduRankRow').show();
				$('#literacyRow').show();
				if (pods['Education'] != undefined) {
					let education = pods['Education'].subpods[0].plaintext;
					let e = education.split('| ');
					let eduNums = [];
					for (let i = 0; i < e.length; i++) {
						let num = e[i].slice(0, 7)
						eduNums[i] = num;
					}
					if (eduNums[0].includes('public')) {
						let eSpend = parseFloat(eduNums[1]);
						$('#eSpend').html(eSpend + ' % GDP');
					}
					if (eduNums.length == 4) {
						if (eduNums[2].includes('m')) {
							let students = parseFloat(eduNums[2]);
							$('#students').html(students + ' M');
						} else {
							let students = parseInt(eduNums[2]);
							students = numberWithCommas(students);
							$('#students').html(students);
						}
						if (eduNums[3].includes('m')) {
							let teachers = parseFloat(eduNums[3]);
							$('#teachers').html(teachers + ' M');
						} else {
							let teachers = parseInt(eduNums[3]);
							teachers = numberWithCommas(teachers);
							$('#teachers').html(teachers);
						}
					} else {
						$('#studentsRow').hide();
						$('#teachersRow').hide();
                    }
					if (pods['UN Human Development Index'] != undefined) {
						let eduUN = pods['UN Human Development Index'].subpods[0].plaintext;
						let index = eduUN.indexOf('education');
						let eduRank = eduUN.slice(index + 31, index + 36);
						if (eduRank.includes(')')) {
							eduRank = eduRank.replace(')', '');
						}
						$('#eduRank').html(eduRank);
					} else {
						$('#eduRankRow').hide();
					}
					if (pods['Cultural properties'] != undefined) {
						let literacy = pods['Cultural properties'].subpods[0].plaintext;
						let index = literacy.indexOf('literacy');
						literacy = literacy.slice(index + 16, index + 22);
						literacy = parseFloat(literacy);
						$('#literacy').html(literacy + ' %');
					} else {
						$('#literacyRow').hide();
                    }
				}
				else {
					$('#eduCard').hide();
				}	
				// Money modal
				$('#gdpCard').show();
				$('#employmentCard').show();
				$('#currencyCard').show();
				$('#businessCard').show();
				$('#inflationRow').show();
				$('#standardsRow').show();				
				$('#newTotalRow').show();
				$('#childLabourRow').show();
				if (pods['Economic properties'] != undefined || pods['Business information'] != undefined || pods['Employment'] != undefined ) {
					// GDP card
					if (pods['Economic properties'] != undefined) {
						let economic = pods['Economic properties'].subpods[0].plaintext;
						let indexGDP = economic.indexOf('GDP | $');
						let gdp = economic.slice(indexGDP + 7, indexGDP + 14);
						let indexRank = economic.indexOf('rank:');
						let gdpRank = economic.slice(indexRank + 6, indexRank + 11);
						if (gdpRank.includes(')')) {
							gdpRank = gdpRank.replace(')', '');
						}
						$('#gdpRank').html(gdpRank);
						if (gdp.includes('t')) {
							gdp = parseFloat(gdp);
							$('#gdp').html('$' + gdp + ' T')
						}
						else if (gdp.includes('b')) {
							gdp = parseFloat(gdp);
							$('#gdp').html('$' + gdp + ' B')
						}
						else {
							gdp = parseFloat(gdp);
							$('#gdp').html('$' + gdp + ' M')
						}
						if (economic.includes('inflation')) {
							let indexInflation = economic.indexOf('inflation');
							let inflation = economic.slice(indexInflation + 12, indexInflation + 20);
							inflationIndex = inflation.indexOf('%');
							inflation = inflation.slice(0, inflationIndex);
							$('#inflation').html(inflation + ' %')
						} else {
							$('#inflationRow').hide();
						}
						if (pods['UN Human Development Index'] != undefined) {
						let standardsUN = pods['UN Human Development Index'].subpods[0].plaintext;
						let index = standardsUN.indexOf('living');
						let standards = standardsUN.slice(index + 38, index + 43);
						if (standards.includes(')')) {
							standards = standards.replace(')', '');
						}
						$('#standards').html(standards);
						} else {
						$('#standardsRow').hide();
						}
					} else {
						$('#gdpCard').hide();
					}
					// currency card
					if (pods['Currency'] != undefined) {
						let currency = pods['Currency'].subpods[0].plaintext;
						let cIndex = currency.lastIndexOf('=');
						let conversion = currency.substring(cIndex + 2);
						$('#conversion').html('= ' + conversion);
					} else {
						$('#currencyCard').hide();
                    }
					// business card
					if (pods['Business information'] != undefined) {
						let business = pods['Business information'].subpods[0].plaintext;
						let taxIndex = business.indexOf('rate');
						let tax = business.slice(taxIndex + 7, taxIndex + 12);
						if (tax.includes('%')) {
							tax = tax.replace('%', '');
						}
						$('#tax').html(tax + ' %');
						let newIndex = business.lastIndexOf('|');
						let newBusiness = business.slice(newIndex + 1, newIndex + 7)
						newBusiness = parseInt(newBusiness);
						newBusiness = numberWithCommas(newBusiness);
						$('#newBusiness').html(newBusiness + ' per year');
						if (business.includes('total businesses')) {
							let perIndex = business.indexOf('year');
							let per = business.slice(perIndex + 6, perIndex + 11);
							$('#per').html(per + ' % annually')
						} else {
							$('#newTotalRow').hide();
                        }
					} else {
						$('#businessCard').hide();
					}
					// employment card
					if (pods['Employment'] != undefined) {
						let employment = pods['Employment'].subpods[0].plaintext;
						let e = employment.split('| ');
						let empNums = [];
						for (let i = 0; i < e.length; i++) {
							let num = e[i].slice(0, 7)
							empNums[i] = num;
						}
						let unemployment = parseFloat(empNums[1]);
						$('#unemployment').html(unemployment + ' %')
						if (employment.includes('long-term')) {
							if (empNums[3].includes('m')) {
								let labour = parseFloat(empNums[3])
								$('#labour').html(labour + ' M')
							}
							else {
								let labour = parseInt(empNums[3])
								labour = numberWithCommas(labour)
								$('#labour').html(labour)
							}
						} else {
							if (empNums[2].includes('m')) {
								let labour = parseFloat(empNums[2])
								$('#labour').html(labour + ' M')
							}
							else {
								let labour = parseInt(empNums[2])
								labour = numberWithCommas(labour)
								$('#labour').html(labour)
							}
                        }
						if (empNums.length == 5) {
							let childLabour = parseFloat(empNums[4]);
							$('#childLabour').html(childLabour + ' %')
						}
						else {
							$('#childLabourRow').hide();
						}
					} else {
						$('#employmentCard').hide();
                    }
				}
				else {
					finance.removeControl();
                }
            }		
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	}); 


	// launch weather modal on click 
	$('.weatherBox').click(function (event) {
		$('#weatherModal').modal('toggle');
		$('#spinner').show()
		//  Openweather api forcast for weather modal
		latLngPromise.then((values) => {
			$.ajax({
				url: "php/getOpenWeatherForcast.php",
				type: 'POST',
				dataType: 'json',
				data: {
					lat: lat,
					lng: lng,
				},
				success: function (result) {
					if (result.status.name == "ok") {
						$('#spinner').hide();
						//current
						let temp = Math.round(result.data.current.temp);
						let desc = result.data.current.weather[0].description[0].toUpperCase() + result.data.current.weather[0].description.slice(1);
						$('#wDesc').html(desc);
						$('#countryTemp').html(temp + '&deg');
						$('#wIconDiv').html('<img id="wImg" src="https://openweathermap.org/img/wn/' + result.data.current.weather[0].icon + '@2x.png">');
						let high = Math.round(result.data.daily[0].temp.max);
						let low = Math.round(result.data.daily[0].temp.min);
						$('#high').html('H: ' + high + '&deg');
						$('#low').html('L: ' + low + '&deg');
						// sunrise and set
						function getTime(timestamp) {
							let date = new Date(timestamp * 1000);
							let hours = '0' + date.getHours();
							hours = hours.slice(-2);
							let minutes = '0' + date.getMinutes();
							minutes = minutes.slice(-2);
							let formattedTime = hours + ':' + minutes;
							return formattedTime;
						}
						function getTimeDiff(sunrise, sunset) {
							let riseMins = parseInt(sunrise.slice(-2));
							let setMins = parseInt(sunset.slice(-2));
							let riseHours = parseInt(sunrise.substring(0, 2));
							let setHours = parseInt(sunset.substring(0, 2));
							if (riseMins > setMins) {
								setMins += 60;
								setHours -= 1; 
							}
							let diffMins = setMins - riseMins;
							diffMins = '0' + diffMins.toString();
							diffMins = diffMins.slice(-2);
							let diffHours = setHours - riseHours;
							diffHours = '0' + diffHours.toString();
							diffHours = diffHours.slice(-2);
							let formattedTimeDiff = diffHours + ':' + diffMins;
							return formattedTimeDiff
						}
						let sunrise = getTime(result.data.current.sunrise);
						let sunset = getTime(result.data.current.sunset);
						let daylight = getTimeDiff(sunrise, sunset);
						$('#sunrise').html(sunrise);
						$('#sunset').html(sunset);
						$('#daylight').html(daylight);
						// daily forcast
						for (i = 1; i < result.data.daily.length; i++) {
							let day = new Date(result.data.daily[i].dt * 1000).getDay();
							switch (day) {
								case 0:
									day = "Sunday";
									break;
								case 1:
									day = "Monday"
									break;
								case 2:
									day = "Tuesday";
									break;
								case 3:
									day = "Wednesday";
									break;
								case 4:
									day = "Thursday";
									break;
								case 5:
									day = "Friday";
									break; 
								case 6:
									day = "Saturday";
									break;
							}
							let dayId = '#d' + [i] + 'Day';
							$(dayId).html(day);
							let iconID = '#d' + [i] + 'Icon';
							$(iconID).html('<img class="wIconsSm" src="https://openweathermap.org/img/wn/' + result.data.daily[i].weather[0].icon + '.png">');
							let rainID = '#d' + [i] + 'Rain';
							let pop = parseInt(result.data.daily[i].pop * 100);
							if (pop > 0) {
								$(rainID).html(pop + '%');
							}
							let hiId = '#d' + [i] + 'Hi';
							let lowId = '#d' + [i] + 'Low';
							let high = Math.round(result.data.daily[i].temp.max);
							let low = Math.round(result.data.daily[i].temp.min);
							$(hiId).html(high + '&deg');
							$(lowId).html(low + '&deg');
						}
				};
				},
				error: function (jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
				}
			});
		});
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
		const settings2 = {
			"async": true,
			"crossDomain": true,
			"url": "https://world-geo-data.p.rapidapi.com/countries/" + this.value + "/cities?format=json&language=en&min_population=1000",
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
		})
		.fail(function () {
			$.ajax(settings2).done(function (response) {
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
			})
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
				if (result.status.name == "ok" && result.data.length > 0) {
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
				}
				else {
					resolve('foo');
                }
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
	Promise.all([libPromise, citiesPromise, capitalPromise, hospPromise, musPromise, thrPromise, uniPromise, trainPromise, metroPromise, busPromise]).then((values) => {
		let overlayMaps = {};
		if (toggleArray['capitalObj']) {
			overlayMaps = {
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
		}
		else {
			overlayMaps = {
				"<span class='city-layer-item'>Major cities</span>": toggleArray['cityCluster'],
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
        }
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