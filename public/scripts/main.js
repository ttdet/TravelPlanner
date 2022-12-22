
/** namespace. */
var rhit = rhit || {};
rhit.storage = rhit.storage || {};
const db = firebase.firestore();

/** globals */
rhit.variableName = "";
rhit.FB_COL_CITY = 'cities';
rhit.FB_COLLECTION_PLAN_AND_ROUTE = 'plansAndRoutes';
rhit.FB_COLLECTION_ROUTE = 'routes';
rhit.FB_KEY_CITY_ID = 'cityId';
rhit.FB_KEY_CITY_NAME = 'cityName';
rhit.FB_KEY_START_CITY_ID = 'startCityId';
rhit.FB_KEY_END_CITY_ID = 'endCityId';
rhit.FB_KEY_START_CITY_NAME = 'startCityName';
rhit.FB_KEY_END_CITY_NAME = 'endCityName';
rhit.FB_KEY_NAME = 'name';
rhit.FB_KEY_START_DATE = 'startDate';
rhit.FB_KEY_END_DATE = 'endDate';
rhit.FB_KEY_START_YEAR = 'startYear';
rhit.FB_KEY_END_YEAR = 'endYear';
rhit.FB_KEY_BUDGET = 'budget';
rhit.FB_KEY_DESCRIPTION = 'description';
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_AUTHOR = "author";
rhit.FB_KEY_ITEM_TYPE = 'type';

rhit.storage.TRIP_ID_KEY = "tripId";

rhit.pageController = null;
rhit.fbAuthManager = null;
rhit.cityManager = null;
rhit.planDetailsManager = null;
rhit.planAndRouteManager = null;
rhit.listPageController = null;
rhit.uid = null;

rhit.storage.getTripId = function () {
	const tripId = sessionStorage.getItem(rhit.storage.TRIP_ID_KEY);
	if (!tripId) {
		console.log("No trip id");
	}
	return tripId;
};
rhit.storage.setTripId = function (tripId) {
	console.log("Set Id: " + tripId);
	sessionStorage.setItem(rhit.storage.TRIP_ID_KEY, tripId);
};


function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.clearErrMsgInModal = (modalId) => {
	$(`#${modalId} .err-msg`).remove();
	$(`#${modalId} input`).attr('style', '');
}

rhit.showErrMsgInModal = (modalId, issues) => {
	let errMsg = '';
	for (const err of issues) {
		if (err == 'startDate empty') {
			errMsg = `
			<div class="err-msg" style="color: red">
				start date cannot be empty
			</div>
			`
			$(`#${modalId} .start-date-field`).append(errMsg);
			$(`#${modalId} .start-date-input`).attr('style', 'border: 1px solid red');
		} else if (err == 'endDate empty') {
			errMsg = `
			<div class="err-msg" style="color: red">
				end date cannot be empty
			</div>
			`
			$(`#${modalId} .end-date-field`).append(errMsg);
			$(`#${modalId} .end-date-input`).attr('style', 'border: 1px solid red');
		} else if (err == 'budget must be positive') {
			errMsg = `
			<div class="err-msg" style="color: red">
				budget must be positive
			</div>
			`
			$(`#${modalId} .budget-field`).append(errMsg);
			$(`#${modalId} .budget-input`).attr('style', 'border: 1px solid red');
		}else if (err == 'endDate before startDate') {
			errMsg = `
			<div class="err-msg" style="color: red">
				end date must be after start date
			</div>
			`
			$(`#${modalId} .end-date-field`).append(errMsg);
			$(`#${modalId} .end-date-input`).attr('style', 'border: 1px solid red');
			$(`#${modalId} .start-date-input`).attr('style', 'border: 1px solid red');
		} else {
			errMsg = `
			<div class="err-msg" style="color: red">
				${err} cannot be empty
			</div>
			`
			$(`#${modalId} .${err}-field`).append(errMsg);
			$(`#${modalId} .${err}-input`).attr('style', 'border: 1px solid red');
		}
	}

}

rhit.validateData = (data) => {
	let issues = [];
	let dateKeys = ['startDate', 'endDate', 'startYear', 'endYear'];

	if (data['endYear'] == undefined) {
		issues.push('endDate empty');
	}

	if (data['startYear'] == undefined) {
		issues.push('startDate empty');
	}

	if (data['endYear'] != undefined && data['startYear'] != undefined) {
		if (data['endYear'] < data['startYear']) {
			issues.push('endDate before startDate');
		} else if (data['endYear'] == data['startYear']) {
			if (data['endDate'] < data['startDate']) {
				issues.push('endDate before startDate');
			}
		}
	}

	if (Number(data['budget']) < 0) {
		issues.push('budget must be positive');
	}

	for (let key in data) {
		if (dateKeys.includes(key)) continue; //skip date values, since they have been verified
		if (data[key] == undefined && key != 'description') {
			issues.push(key);
		} else if (data[key].trim().length == 0 && key != 'description') {
			issues.push(key);
		}
	}


	return issues;

}

//main page controller
rhit.MapPageController = class {

	constructor() {
		rhit.planAndRouteManager.beginListening(this.updateAllViews.bind(this));
		this.initializePopover();
		this.initializeModal();
		this.routeLines = [];
		this.routeDisplay = true;

		// document.querySelector("#startRoute").addEventListener("click", (event) => {
		// 	const startCity = document.querySelector("#cityPlanName").value;
		// });

		document.querySelector("#myMapButt").addEventListener("click", (event) => {
			window.location.href = "/map.html"
		});
		document.querySelector("#myPlansButt").addEventListener("click", (event) => {
			window.location.href = "/plan.html"
		});
		document.querySelector("#signOutMenuButt").addEventListener("click", (event) => {
			rhit.fbAuthManager.signOut();
		});

		$('#clrRouteSelBtn').on('click', (event) => {
			rhit.planAndRouteManager.routeState = 0;
			$('[data-toggle="popover"]').popover('hide');
			this.updateDisplayRouteSelection();
		})

		$('#mapLevel').on('click', (event) => {
			$('[data-toggle="popover"]').popover('hide');
		})

		$('#closeAllPopover').on('click', () => {
			$('[data-toggle="popover"]').popover('hide');
		})

		$('#toggleRouteDisplay').on('click', () => {
			this.routeDisplay = !this.routeDisplay;
			this.updateAllViews();
		})
	}

	initializePopover = () => {
		$('[data-toggle="popover"]').on('shown.bs.popover', (event) => {
			const target_po = event.target.getAttribute('aria-describedby');
			const target_city_id = event.target.dataset.pinCityId;
			const target_city_name = event.target.dataset.pinCityName;
			let btn_grp = null;
			if (rhit.planAndRouteManager.routeState == 0) {
				btn_grp = `
					<div class="container justify-content-center">
						<div class='city-btn'><button class="btn btn-primary btn-sm city-detail-btn" style="margin: 4px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#cityDetailModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Detail</button></div>
						<div class='city-btn'><button class="btn btn-success btn-sm add-dest-btn" style="margin: 2px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#addDestModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Create Plan</button></div>
						<div class='city-btn'><button class="btn btn-danger btn-sm start-route-btn" style="margin: 2px 0px 4px 0px; width: 100%" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Start Route</button></div>
						<div class='city-btn'><button class="btn btn-danger btn-sm end-route-btn" style="margin: 2px 0px 4px 0px; width: 100%; display: none;" data-bs-toggle="modal" data-bs-target="#addRouteModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">End Route</button></div>
					</div>  
					`
			} else if (rhit.planAndRouteManager.routeState == 1) {
				if (target_city_id == rhit.planAndRouteManager.startCityId) {
					btn_grp = `
					<div class="container justify-content-center">
						<div class='city-btn'><button class="btn btn-primary btn-sm city-detail-btn" style="margin: 4px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#cityDetailModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Detail</button></div>
						<div class='city-btn'><button class="btn btn-success btn-sm add-dest-btn" style="margin: 2px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#addDestModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Create Plan</button></div>
					</div>  
					`
				} else {
					btn_grp = `
					<div class="container justify-content-center">
						<div class='city-btn'><button class="btn btn-primary btn-sm city-detail-btn" style="margin: 4px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#cityDetailModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Detail</button></div>
						<div class='city-btn'><button class="btn btn-success btn-sm add-dest-btn" style="margin: 2px 0px 2px 0px; width: 100%" data-bs-toggle="modal" data-bs-target="#addDestModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Create Plan</button></div>
						<div class='city-btn'><button class="btn btn-danger btn-sm start-route-btn" style="margin: 2px 0px 4px 0px; width: 100%; display: none;" data-city-id="${target_city_id}" data-city-name="${target_city_name}">Start Route</button></div>
						<div class='city-btn'><button class="btn btn-danger btn-sm end-route-btn" style="margin: 2px 0px 4px 0px; width: 100%;" data-bs-toggle="modal" data-bs-target="#addRouteModal" data-city-id="${target_city_id}" data-city-name="${target_city_name}">End Route</button></div>
					</div>  
					`
				}

			}


			$(`#${target_po}`).append(btn_grp);

			$('.city-detail-btn').on('click', (event) => {
				this.prepareCityDetailModal(event.target.dataset.cityId);
				rhit.planAndRouteManager.addPlanCityId = event.target.dataset.cityId;
				rhit.planAndRouteManager.addPlanCityName = event.target.dataset.cityName;
			})

			$('.add-dest-btn').on('click', (event) => {
				this.prepareAddDestModal(event.target.dataset.cityId, event.target.dataset.cityName);
				rhit.planAndRouteManager.addPlanCityId = event.target.dataset.cityId;
				rhit.planAndRouteManager.addPlanCityName = event.target.dataset.cityName;
			})

			$('.start-route-btn').on('click', (event) => {

				if (rhit.planAndRouteManager.routeState == 0) {
					$('.start-route-btn, .end-route-btn').toggle();
					$(`.end-route-btn[data-city-id=${event.target.dataset.cityId}]`).toggle();
				}
				rhit.planAndRouteManager.routeState = 1;
				rhit.planAndRouteManager.startCityId = event.target.dataset.cityId;
				rhit.planAndRouteManager.startCityName = event.target.dataset.cityName;
				this.updateDisplayRouteSelection();
			})

			$('.end-route-btn').on('click', (event) => {
				rhit.planAndRouteManager.routeState = 0;
				rhit.planAndRouteManager.endCityId = event.target.dataset.cityId;
				rhit.planAndRouteManager.endCityName = event.target.dataset.cityName;
				this.updateDisplayRouteSelection();
				this.prepareAddRouteModal();
			})

		})
	}


	initializeModal = () => {
		$('.modal').on('show.bs.modal', (event) => {
			$('[data-toggle="popover"]').popover('hide');
		})

		$('.modal').on('hidden.bs.modal', (event) => {
			rhit.clearErrMsgInModal(event.target.id);
		})

		$('#cityDetailModal').on('hidden.bs.modal', (event) => {
			$('#cityDetailModal .carousel-item').remove();
			$('#cityDetailModal .city-detail-title').html(" ");
			$('#cityDetailModal .city-detail-intro').html(" ");
		})

		$('#addDestModal').on('hidden.bs.modal', (event) => {
			$('#addDestModal .add-dest-title').html(" ");
			$('#addDestModal .form-group input,textarea').val('');
		})

		$('#addRouteModal').on('hidden.bs.modal', (event) => {
			$('#addRouteModal .add-route-title').html(" ");
			$('#addRouteModal .form-group input,textarea').val('');
		})

		$('#buildPlanFromModalBtn').on('click', (event) => {
			this.prepareAddDestModal(rhit.planAndRouteManager.addPlanCityId, rhit.planAndRouteManager.addPlanCityName);
			$('#cityDetailModal').modal('hide');
			$('#addDestModal').modal('show');
		})

		document.querySelector("#submitAddPlan").addEventListener("click", (event) => {
			rhit.clearErrMsgInModal('addDestModal');
			const startDate = $("#cityPlanStartDate").val();
			const startDateSegs = startDate.split('/');
			const endDate = $("#cityPlanEndDate").val();
			const endDateSegs = endDate.split('/');
			// const cityInfo = {
			// 	'cityId': rhit.planAndRouteManager.addPlanCityId,
			// 	'cityName': rhit.planAndRouteManager.addPlanCityName,
			// 	'name': $('#cityPlanName').val(),
			// 	'budget': $('#cityPlanBudget').val(),
			// 	'description': $('#cityPlanDescription').val(),
			// 	'startDate': startDate == undefined ? undefined : startDateSegs[0] + '/' + startDateSegs[1],
			// 	'startYear': startDateSegs[2],
			// 	'endDate': endDate == undefined ? undefined : endDateSegs[0] + '/' + endDateSegs[1],
			// 	'endYear': endDateSegs[2]
			// }

			//Year included in startDate
			const cityInfo = {
				'cityId': rhit.planAndRouteManager.addPlanCityId,
				'cityName': rhit.planAndRouteManager.addPlanCityName,
				'name': $('#cityPlanName').val(),
				'budget': $('#cityPlanBudget').val(),
				'description': $('#cityPlanDescription').val(),
				'startDate': startDate,
				'startYear': startDateSegs[2],
				'endDate': endDate,
				'endYear': endDateSegs[2]
			}

			let issues = rhit.validateData(cityInfo)
			if (issues.length == 0) {
				rhit.planAndRouteManager.addCityPlan(cityInfo);
				$('#addDestModal').modal('hide');
			} else {
				rhit.showErrMsgInModal('addDestModal', issues);
			}
		});

		$('#submitAddRoute').on('click', (event) => {
			rhit.clearErrMsgInModal('addRouteModal');
			const startDate = $("#routeStartDate").val();
			const startDateSegs = startDate.split('/');
			const endDate = $("#routeEndDate").val();
			const endDateSegs = endDate.split('/');
			// const routeInfo = {
			// 	'name': $('#routeName').val(),
			// 	'startDate': $('#routeStartDate').val(),
			// 	'budget': $('#routeBudget').val(),
			// 	'description': $('#routeDescription').val(),
			// 	'startDate': startDate == undefined ? undefined : startDateSegs[0] + '/' + startDateSegs[1],
			// 	'startYear': startDateSegs[2],
			// 	'endDate': endDate == undefined ? undefined : endDateSegs[0] + '/' + endDateSegs[1],
			// 	'endYear': endDateSegs[2]
			// }
			//Year included in start date
			const routeInfo = {
				'name': $('#routeName').val(),
				'startDate': $('#routeStartDate').val(),
				'budget': $('#routeBudget').val(),
				'description': $('#routeDescription').val(),
				'startDate': startDate,
				'startYear': startDateSegs[2],
				'endDate': endDate,
				'endYear': endDateSegs[2]
			}
			let issues = rhit.validateData(routeInfo)
			if (issues.length == 0) {
				rhit.planAndRouteManager.addRoute(routeInfo);
				$('#addRouteModal').modal('hide');
			} else {
				rhit.showErrMsgInModal('addRouteModal', issues);
			}
		})

	}

	updateAllViews = () => {
		for (const line of this.routeLines) {
			line.remove();
		}
		this.routeLines = [];
		for (const item of rhit.planAndRouteManager.allPlansRouteslist) {
			const type = item.get(rhit.FB_KEY_ITEM_TYPE);

			if (type == 'plan') {
				const cityId = item.get(rhit.FB_KEY_CITY_ID);
				$(`.pinpoint[data-pin-city-id=${cityId}]`).attr("src", "imgs/redpin_9_14.jpg");
			} else { //item is a route
				if (this.routeDisplay) {
					const startCityId = item.get(rhit.FB_KEY_START_CITY_ID);
					const endCityId = item.get(rhit.FB_KEY_END_CITY_ID);
					const startDate = item.get(rhit.FB_KEY_START_DATE);
					const dateSegs = startDate.split('/');
					const processed_startDate = dateSegs[0] + "/" + dateSegs[1];
					const lineOptions = {
						dash: { animation: true },
						dropShadow: true,
						size: 3,
						color: '#800000',
						middleLabel: LeaderLine.captionLabel({ text: `${processed_startDate}`, fontSize: '12px' }),
					};

					this.routeLines.push(new LeaderLine(document.querySelector(`img[data-pin-city-id="${startCityId}"]`), document.querySelector(`img[data-pin-city-id="${endCityId}"]`), lineOptions));
				}
			}
		}



	}

	updateDisplayRouteSelection() {
		if (rhit.planAndRouteManager.routeState == 0) {
			$('#navBarTitle').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Where do you want to go?');
			$('#clrRouteSelBtn').attr('style', 'display: none');
		} else {
			$('#navBarTitle').html(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Building a route starting at ${rhit.planAndRouteManager.startCityName}`);
			$('#clrRouteSelBtn').attr('style', 'display: inline-block');
		}
	}


	prepareCityDetailModal(cityId) {
		rhit.cityManager.getCity(cityId).then(cityInfo => {
			$('#cityDetailModal .city-detail-title').html(cityInfo.name);
		
			const newInfo = cityInfo.info.replaceAll('\\n', '\n');
			//console.log(newInfo);
			$('#cityDetailModal .city-detail-intro').html(newInfo);
			$('#cityDetailModal .city-detail-intro').attr('style', 'white-space: pre-line')

			for (const imgLink of cityInfo.imgSrc) {
				const carouselItem = `
				<div class="carousel-item">
					<img src="${imgLink}" class="d-block w-100" alt="${cityInfo.name} picture">
				</div>
				`
				$('#cityDetailModal .city-detail-carousel .carousel-inner').append(carouselItem);
			}

			$('#cityDetailModal .city-detail-carousel .carousel-item').first().addClass('active');

			});
		
	}

	prepareAddRouteModal(cityId, cityName) {
		$('#addRouteModal .add-route-title').html(`Adding a route plan from ${rhit.planAndRouteManager.startCityName} to ${rhit.planAndRouteManager.endCityName}`);
	}

	prepareAddDestModal(cityId, cityName) {
		$('#addDestModal .add-dest-title').html('Adding a travel plan to ' + cityName);
		$('#addDestModal').attr('data-city-id', cityId);
		$('#addDestModal').attr('data-city-name', cityName);
	}



}

//main page model
rhit.CityManager = class {

	constructor() {
		this.cityCollection = db.collection(rhit.FB_COL_CITY);
		this._unsubcribe = null;
	}

	async getCity(Id) {

		const cityRef = this.cityCollection.doc(String(Id));
		const doc = await cityRef.get();
		if (!doc.exists) {
			console.err('No such city');
			return null;
		} else {
			// return new Promise((resolve, reject) => {
			// 	resolve(doc.data());
			// })
			return doc.data();
		}
	}
}

rhit.Plan = class {
	constructor(id, cityId, cityName, name, startDate, endDate, startYear, endYear, budget, description, author, timestamp) {
		this.type = "Plan";
		this.id = id;
		this.cityId = cityId;
		this.cityName = cityName;
		this.name = name;
		this.startDate = startDate;
		this.endDate = endDate;
		this.startYear = startYear;
		this.endYear = endYear;
		this.budget = budget;
		this.description = description;
		this.author = author;
		this.timestamp = timestamp;
	}	
}
rhit.Route = class {
	constructor(id, startCityId, startCityName, endCityId, endCityName, name, startDate, endDate, startYear, endYear, budget, description, author, timestamp) {
		this.type = "Route";
		this.id = id;
		this.startCityId = startCityId;
		this.startCityName = startCityName;
		this.endCityId = endCityId;
		this.endCityName = endCityName;
		this.name = name;
		this.startDate = startDate;
		this.endDate = endDate;
		this.startYear = startYear;
		this.endYear = endYear;
		this.budget = budget;
		this.description = description;
		this.author = author;
		this.timestamp = timestamp;
	}	
}

rhit.PlanDetailsManager = class {
	constructor(planId) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._planDoc = firebase.firestore().collection(rhit.FB_COLLECTION_PLAN_AND_ROUTE).doc(planId);
		this.planId = planId;
	}

	beginListening(updateListener) {
		this._unsubscribe = this._planDoc.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				console.log("User ID:", this.uid);
				this._documentSnapshot = doc;
				updateListener();
			} else {
				console.log("No such document!");
			}
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	edit(name, startDate, endDate, startYear, endYear, budget, description) {
		console.log(`Document being edited: ${this._planDoc}`)
		this._planDoc.update({
			// [rhit.FB_KEY_NAME]: name,							//have to decide whether or not names will be editable
			[rhit.FB_KEY_START_DATE]: startDate,
			[rhit.FB_KEY_END_DATE]: endDate,
			[rhit.FB_KEY_START_YEAR]: startYear,
			[rhit.FB_KEY_END_YEAR]: endYear,
			[rhit.FB_KEY_BUDGET]: budget,
			[rhit.FB_KEY_DESCRIPTION]: description,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now()
		});
		// .then((docRef) => {
		// 	console.log("Plan edited with ID: ", docRef.id);
		// })
		// .catch((error) => {
		// 	console.error("Error editing plan: ", error);
		// });
	}
	delete() {
		return this._planDoc.delete();
	}

	get startDate() {
		return this._documentSnapshot.get(rhit.FB_KEY_START_DATE);
	}
	get endDate() {
		return this._documentSnapshot.get(rhit.FB_KEY_END_DATE);
	}
	get budget() {
		return this._documentSnapshot.get(rhit.FB_KEY_BUDGET);
	}
	get description() {
		return this._documentSnapshot.get(rhit.FB_KEY_DESCRIPTION);
	}
}

rhit.PlanAndRouteManager = class {
	constructor(uid) {
		this.routeState = 0;
		this.startCityId = null;
		this.startCityName = null;
		this.endCityId = null;
		this.endCityName = null;
		this.addPlanCityId = null;
		this.addPlanCityName = null;
		this._uid = uid;
		this.allPlansRoutesCol = firebase.firestore().collection(rhit.FB_COLLECTION_PLAN_AND_ROUTE);
		this._unsubcribe = null;
		this.allPlansRouteslist = [];
	}

	beginListening(updateListener) {
		// if (this._uid) { // run if not null
		// 	query = query.where(rhit.FB_KEY_AUTHOR, "==", this._uid);
		// }
		this._unsubcribe = this.allPlansRoutesCol
			.where(rhit.FB_KEY_AUTHOR, '==', rhit.fbAuthManager.uid)
			.orderBy('startYear', 'asc')
			.orderBy('startDate', 'asc')
			.limit(100)
			.onSnapshot((docSnapshot) => {
				this.allPlansRouteslist = docSnapshot.docs;	//does this add a new document/plan to the list of cities that have a plan?
				updateListener();
			})

	}

	stopListening() {
		this._unsubscribe();
	}

	addCityPlan(cityInfo) {
		this.allPlansRoutesCol.add({
			[rhit.FB_KEY_CITY_ID]: cityInfo.cityId,
			[rhit.FB_KEY_CITY_NAME]: cityInfo.cityName,
			[rhit.FB_KEY_NAME]: cityInfo.name,
			[rhit.FB_KEY_START_DATE]: cityInfo.startDate,
			[rhit.FB_KEY_END_DATE]: cityInfo.endDate,
			[rhit.FB_KEY_START_YEAR]: cityInfo.startYear,
			[rhit.FB_KEY_END_YEAR]: cityInfo.endYear,
			[rhit.FB_KEY_BUDGET]: cityInfo.budget,
			[rhit.FB_KEY_DESCRIPTION]: cityInfo.description,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			[rhit.FB_KEY_ITEM_TYPE]: 'plan'
		})
			.then((docRef) => {
				console.log("Plan written with ID: ", docRef.id);
				window.location.href = "/plan.html"

			})
			.catch((error) => {
				console.error("Error adding plan: ", error);
			});
	}

	addRoute(routeInfo) {
		this.allPlansRoutesCol.add({
			[rhit.FB_KEY_START_CITY_ID]: rhit.planAndRouteManager.startCityId,
			[rhit.FB_KEY_START_CITY_NAME]: rhit.planAndRouteManager.startCityName,
			[rhit.FB_KEY_END_CITY_ID]: rhit.planAndRouteManager.endCityId,
			[rhit.FB_KEY_END_CITY_NAME]: rhit.planAndRouteManager.endCityName,
			[rhit.FB_KEY_NAME]: routeInfo.name,
			[rhit.FB_KEY_START_DATE]: routeInfo.startDate,
			[rhit.FB_KEY_END_DATE]: routeInfo.endDate,
			[rhit.FB_KEY_START_YEAR]: routeInfo.startYear,
			[rhit.FB_KEY_END_YEAR]: routeInfo.endYear,
			[rhit.FB_KEY_BUDGET]: routeInfo.budget,
			[rhit.FB_KEY_DESCRIPTION]: routeInfo.description,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			[rhit.FB_KEY_ITEM_TYPE]: 'route'
		})
			.then((docRef) => {
				console.log("route written with ID: ", docRef.id);
			})
			.catch((error) => {
				console.error("Error adding route: ", error);
			});
	}

	getTripAtIndex(index) {
		const docSnapshot = this.allPlansRouteslist[index];
		let trip = "";

		if( docSnapshot.get(rhit.FB_KEY_ITEM_TYPE) == "plan" ){
			trip = new rhit.Plan(docSnapshot.id,
				docSnapshot.get(rhit.FB_KEY_CITY_ID),
				docSnapshot.get(rhit.FB_KEY_CITY_NAME),
				docSnapshot.get(rhit.FB_KEY_NAME),
				docSnapshot.get(rhit.FB_KEY_START_DATE),
				docSnapshot.get(rhit.FB_KEY_END_DATE),
				docSnapshot.get(rhit.FB_KEY_START_YEAR),
				docSnapshot.get(rhit.FB_KEY_END_YEAR),
				docSnapshot.get(rhit.FB_KEY_BUDGET),
				docSnapshot.get(rhit.FB_KEY_DESCRIPTION),
				docSnapshot.get(rhit.FB_KEY_AUTHOR),
				docSnapshot.get(rhit.FB_KEY_LAST_TOUCHED)
			);
		} else {
			trip = new rhit.Route(docSnapshot.id,
				docSnapshot.get(rhit.FB_KEY_START_CITY_ID),
				docSnapshot.get(rhit.FB_KEY_START_CITY_NAME),
				docSnapshot.get(rhit.FB_KEY_END_CITY_ID),
				docSnapshot.get(rhit.FB_KEY_END_CITY_NAME),
				docSnapshot.get(rhit.FB_KEY_NAME),
				docSnapshot.get(rhit.FB_KEY_START_DATE),
				docSnapshot.get(rhit.FB_KEY_END_DATE),
				docSnapshot.get(rhit.FB_KEY_START_YEAR),
				docSnapshot.get(rhit.FB_KEY_END_YEAR),
				docSnapshot.get(rhit.FB_KEY_BUDGET),
				docSnapshot.get(rhit.FB_KEY_DESCRIPTION),
				docSnapshot.get(rhit.FB_KEY_AUTHOR),
				docSnapshot.get(rhit.FB_KEY_LAST_TOUCHED)
			);
		}
		return trip;
	}

	delete() {
		const id = rhit.storage.getTripId();
		return this.allPlansRoutesCol.doc(id).delete();
	}

	get length() {
		return this.allPlansRouteslist.length;
	}



}

rhit.city = class {
	constructor(id, name, imgSrc, info) {
		this.id = id;
		this.name = name;
		this.imgSrc = imgSrc;
		this.info = info;
	}
}


rhit.ListPageController = class {
	constructor() {
		let readyForDelete = 0;
		const filterList = new Map([
				["100", "NYButt"],
				["101", "MiamiButt"],
				["102", "LAButt"],
				["103", "ChicButt"],
				["104", "HoustonButt"],
				["105", "SeattleButt"],
				["106", "BostonButt"],
				["107", "DCButt"],
				["108", "SFButt"],
				["109", "PhillyButt"],
				["110", "PhoenixButt"],
				["111", "LVButt"],
				["112", "SLCButt"],
				["113", "DallasButt"],
				["114", "AtlantaButt"],
				["115", "DenverButt"]
		]);

		document.querySelector("#planDoneButt").addEventListener("click", (event) => {


			// const name = document.querySelector("#name").value;    //use standin for Plan's name since its not editable as of now
			const name = "placeHolderName";
			const startDate = document.querySelector("#startDateInput").value;
			const endDate = document.querySelector("#endDateInput").value;
			const budget = document.querySelector("#budgetInput").value;
			const description = document.querySelector("#descripInput").value;

			const tripId = rhit.storage.getTripId();

			rhit.clearErrMsgInModal('planDetails');
			const startDateSegs = startDate.split('/');
			const endDateSegs = endDate.split('/');
			// let startDateNew = undefined ? undefined : startDateSegs[0] + '/' + startDateSegs[1];
			let startYear = startDateSegs[2];
			// let endDateNew = undefined ? undefined : endDateSegs[0] + '/' + endDateSegs[1];
			let endYear = endDateSegs[2];

			const tripInfo = {
				'name': "Placeholder",
				'startDate': $('#routeStartDate').val(),
				'budget': $('#budgetInput').val(),
				'description': $('#descripInput').val(),
				'startDate': startDate,
				'startYear': startYear,
				'endDate': endDate,
				'endYear': endYear
			}

			let issues = rhit.validateData(tripInfo)
			if (issues.length == 0) {
				rhit.planDetailsManager = new rhit.PlanDetailsManager(tripId);						
				rhit.planDetailsManager.edit(name, startDate, endDate, startYear, endYear, budget, description);
				$('#planDetails').modal('hide');
				rhit.clearErrMsgInModal("planDetails");
			} else {
				rhit.showErrMsgInModal('planDetails', issues);
			}
		});

		rhit.planAndRouteManager.beginListening(this.updateList.bind(this));

		//Navbar Butts
		document.querySelector("#myMapButt").addEventListener("click", (event) => {
			window.location.href = "/map.html"
		});
		document.querySelector("#myPlansButt").addEventListener("click", (event) => {
			window.location.href = "/plan.html"
		});
		document.querySelector("#signOutMenuButt").addEventListener("click", (event) => {
			rhit.fbAuthManager.signOut();
		});
		document.querySelector("#submitDeletePlan").addEventListener("click", (event) => {
			const tripId = rhit.storage.getTripId();
			console.log("Clicked submit deletion for: " + tripId);
			rhit.planAndRouteManager.delete().then(() => {
				this.updateList(99);
			});
		});
		
		//Dropdown Butts
		for(const key of filterList.keys()){
			console.log("Value of key: " + filterList.get(key));
			document.querySelector("#" + filterList.get(key)).addEventListener("click", (event) => {
				this.updateList(key);
			});
		}
	}

	//Update Viewer
	updateList(code="99") {
		let noCitiesToShow = 1;

		const newMess = htmlToElement('<div id="mess"></div');
		const newJan = htmlToElement('<div id="janList"></div');		
		const newFeb = htmlToElement('<div id="febList"></div');
		const newMar = htmlToElement('<div id="marList"></div');
		const newApr = htmlToElement('<div id="aprList"></div');
		const newMay = htmlToElement('<div id="mayList"></div');
		const newJun = htmlToElement('<div id="junList"></div');
		const newJul = htmlToElement('<div id="julList"></div');
		const newAug = htmlToElement('<div id="augList"></div');
		const newSep = htmlToElement('<div id="sepList"></div');
		const newOct = htmlToElement('<div id="octList"></div');
		const newNov = htmlToElement('<div id="novList"></div');
		const newDec = htmlToElement('<div id="decList"></div');

		document.querySelector(".jan").innerHTML = "";
		document.querySelector(".feb").innerHTML = "";
		document.querySelector(".mar").innerHTML = "";
		document.querySelector(".apr").innerHTML = "";
		document.querySelector(".jun").innerHTML = "";
		document.querySelector(".jul").innerHTML = "";
		document.querySelector(".aug").innerHTML = "";
		document.querySelector(".sep").innerHTML = "";
		document.querySelector(".oct").innerHTML = "";
		document.querySelector(".nov").innerHTML = "";
		document.querySelector(".dec").innerHTML = "";

		for (let i = 0; i < rhit.planAndRouteManager.length; i++) {
			
			const trip = rhit.planAndRouteManager.getTripAtIndex(i); 	
			console.log("Trip:" + trip);
			
			let tripCityId = "";
			if(trip.type == "Plan"){
				tripCityId = trip.cityId;
			} else {
				tripCityId = trip.startCityId;
			}

			if(this.checkCityId(tripCityId, code)){
				noCitiesToShow = 0;

				rhit.cityManager.getCity(tripCityId).then(cityData => {		//get city data, and then use img file path in that data to create a card
					const newCard = this._createCard(trip, cityData);
					newCard.onclick = (event) => {
						rhit.storage.setTripId(trip.id);
						this.updateModalDetails(trip);
					};
					newCard.firstElementChild.firstElementChild.onclick = (event) => {
						$("#planDetails").modal('show');
						$('.modal').on('hidden.bs.modal', (event) => {
							rhit.clearErrMsgInModal("planDetails");
						})
						console.log("Clicked on card with id: ", trip.id);
					};
					const startDate = trip.startDate;
					const startParts = startDate.split('/');
					const startMonth = parseInt(startParts[0], 10);
					// const startDay = parseInt(startDate[1], 10);
					// const startYear = parseInt(startDate[2], 10);
					switch (startMonth) {
						case 1:
							newJan.appendChild(newCard);
							document.querySelector(".jan").innerHTML = "January";
							break;
						case 2:
							newFeb.appendChild(newCard);
							document.querySelector(".feb").innerHTML = "February";
							break;
						case 3:
							newMar.appendChild(newCard);
							document.querySelector(".mar").innerHTML = "March";
							break;
						case 4:
							newApr.appendChild(newCard);
							document.querySelector(".apr").innerHTML = "April";
							break;
						case 5:
							newMay.appendChild(newCard);
							document.querySelector(".may").innerHTML = "May";
							break;
						case 6:
							newJun.appendChild(newCard);
							document.querySelector(".jun").innerHTML = "June";
							break;
						case 7:
							newJul.appendChild(newCard);
							document.querySelector(".jul").innerHTML = "July";
							break;
						case 8:
							newAug.appendChild(newCard);
							document.querySelector(".aug").innerHTML = "August";
							break;
						case 9:
							newSep.appendChild(newCard);
							document.querySelector(".sep").innerHTML = "September";
							break;
						case 10:
							newOct.appendChild(newCard);
							document.querySelector(".oct").innerHTML = "October";
							break;
						case 11:
							newNov.appendChild(newCard);
							document.querySelector(".nov").innerHTML = "November";
							break;
						case 12:
							newDec.appendChild(newCard);
							document.querySelector(".dec").innerHTML = "December";
							break;
					}
				});
			}
		}
		if(noCitiesToShow){
			console.log("No Cities");
			const message = htmlToElement(`<h3>You have not created any routes or plans for this city :(</h3>`);
			newMess.appendChild(message);
		}
		const oldMess = document.querySelector("#mess");
		oldMess.parentElement.appendChild(newMess);
		oldMess.removeAttribute("id");
		oldMess.hidden = true;

		const oldJan = document.querySelector("#janList");
		oldJan.removeAttribute("id");
		oldJan.hidden = true;
		oldJan.parentElement.appendChild(newJan);

		const oldFeb = document.querySelector("#febList");
		oldFeb.removeAttribute("id");
		oldFeb.hidden = true;
		oldFeb.parentElement.appendChild(newFeb);

		const oldMar = document.querySelector("#marList");
		oldMar.removeAttribute("id");
		oldMar.hidden = true;
		oldMar.parentElement.appendChild(newMar);

		const oldApr = document.querySelector("#aprList");
		oldApr.removeAttribute("id");
		oldApr.hidden = true;
		oldApr.parentElement.appendChild(newApr);

		const oldMay = document.querySelector("#mayList");
		oldMay.removeAttribute("id");
		oldMay.hidden = true;
		oldMay.parentElement.appendChild(newMay);

		const oldJun = document.querySelector("#junList");
		oldJun.removeAttribute("id");
		oldJun.hidden = true;
		oldJun.parentElement.appendChild(newJun);

		const oldJul = document.querySelector("#julList");
		oldJul.removeAttribute("id");
		oldJul.hidden = true;
		oldJul.parentElement.appendChild(newJul);

		const oldAug = document.querySelector("#augList");
		oldAug.removeAttribute("id");
		oldAug.hidden = true;
		oldAug.parentElement.appendChild(newAug);

		const oldSep = document.querySelector("#sepList");
		oldSep.removeAttribute("id");
		oldSep.hidden = true;
		oldSep.parentElement.appendChild(newSep);

		const oldOct = document.querySelector("#octList");
		oldOct.removeAttribute("id");
		oldOct.hidden = true;
		oldOct.parentElement.appendChild(newOct);

		const oldNov = document.querySelector("#novList");
		oldNov.removeAttribute("id");
		oldNov.hidden = true;
		oldNov.parentElement.appendChild(newNov);

		const oldDec = document.querySelector("#decList");
		oldDec.removeAttribute("id");
		oldDec.hidden = true;
		oldDec.parentElement.appendChild(newDec);
	}

	updateModalDetails(trip) {
		document.querySelector("#detailModalTitle").innerHTML = trip.name;
		document.querySelector("#startDateInput").value = trip.startDate;
		document.querySelector("#endDateInput").value = trip.endDate;
		document.querySelector("#budgetInput").value = trip.budget;
		document.querySelector("#descripInput").value = trip.description;
		if(trip.type == "Plan"){
			document.querySelector("#detailModalSubtitle").innerHTML = `${trip.cityName} Plan`;
		} else {
			document.querySelector("#detailModalSubtitle").innerHTML = `${trip.startCityName} to ${trip.endCityName} Route`;
		}
	}

	checkCityId(id, code){
		if(code == 99){
			console.log("true")
			return true;
		}
		if(code == id){
			return true;
		}
		console.log("false");
		return false;
	}

	//Helper Functions
	_createCard(trip, cityData) {
		let cityName = "";
		if(trip.type == "Plan"){
			cityName = trip.cityName;
		} else {
			cityName = trip.startCityName;
		}
		console.log("Trip.startdate: " + trip.startDate);

		return htmlToElement(`
			<div>
				<div class="pin">
					<div class=bounds>
						<div>
							<img src=${cityData.imgSrc[0]} class='iconDetails'>
						</div>
						<div style='margin-left:120px;'>
							<h4 class="title">${trip.name}</h4>
							<div></div>
							<span class="travel-type" style="font-size:1em">${trip.type}</span>
							<span class="travel-type-value" style="font-size:1em">for ${cityName}</span>
							<div></div>
							<span class="start-date" style="font-size:1em">Start Date- </span>
							<span class="start-date-value" style="font-size:1em">${trip.startDate}</span>
							<div></div>
							<span class="budget" style="font-size:1em">Budget- </span>
							<span class="budget-value" style="font-size:1em">$${trip.budget}</span>
						</div>
					</div>
					<button id="deletePlanOrRoute" type="button" class="btn bmd-btn-fab" data-toggle="modal" data-target="#deletePlanDialog">
						<i class="material-icons">close</i>
					</button>
				</div>
				<hr>
			</div>
		`)
	}

};


rhit.LoginPageController = class {
	constructor() {
		document.querySelector("#rosefireButton").onclick = (event) => {
			rhit.fbAuthManager.signIn();
		}
	}
}

rhit.FbAuthManager = class { //scaffolding always changes
	constructor() {
		this._user = null;
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	signIn() {
		console.log("Sign in using Rosefire");
		Rosefire.signIn("9dc0940e-ea6b-4a43-9fb1-873b6cff11b8", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);

			firebase.auth().signInWithCustomToken(rfUser.token)
				.catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;
					if (errorCode === 'auth/invalid-custom-token') {
						alert('The token you provided is not valid.');
					} else {
						console.error("Custom auth error", errorCode, errorMessage);
					}
				});
		});

	}
	signOut() {
		console.log('attemping sign out');
		firebase.auth().signOut().catch((error) => {
			console.log("Sign out error");
		});
	}
	get isSignedIn() {
		return !!this._user;
	}
	get uid() {
		return this._user.uid;
	}
}

rhit.checkForRedirects = function () {
	if (document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		console.log('redirecting to map');
		window.location.href = "/map.html";
	}

	if (!document.querySelector("#loginPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/index.html"
	}
}

rhit.initializeClasses = function () {
	rhit.cityManager = new rhit.CityManager();
	rhit.planAndRouteManager = new rhit.PlanAndRouteManager(rhit.fbAuthManager.uid);
	if (document.querySelector('#mainPage')) {
		rhit.pageController = new rhit.MapPageController();
	} else {
		rhit.listPageController = new rhit.ListPageController();
	}
}
/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	//const urlParams = new URLSearchParams(window.location.search);

	rhit.fbAuthManager = new rhit.FbAuthManager();
	let uid = null;
	rhit.fbAuthManager.beginListening(() => {
		console.log("Auth state changed. isSignedIn = ", rhit.fbAuthManager.isSignedIn);
		rhit.checkForRedirects();
		if (rhit.fbAuthManager.isSignedIn) {
			rhit.initializeClasses();
		} else {
			if (document.querySelector("#loginPage")) {
				console.log("You are on the login page.");
				new rhit.LoginPageController();
			}
		}
	});

	//if (document.querySelector('#mainPage') || document.querySelector())

	// window.addEventListener('popstate', (event) => {
	// 	rhit.initializeClasses();
	// })

	$(document).ready(() => {
		$('[data-toggle="popover"]').popover();
		$('#cityPlanStartDate').datepicker().on('show', () => {
			// $('.datepicker').css('transform', 'translateY(80px)');
		});
		$('#cityPlanEndDate').datepicker().on('show', () => {
			// $('.datepicker').css('transform', 'translateY(80px)');
		});
		$('#routeStartDate').datepicker().on('show', () => {
			// $('.datepicker').css('transform', 'translateY(80px)');
		});
		$('#routeEndDate').datepicker().on('show', () => {
			// $('.datepicker').css('transform', 'translateY(80px)');
		});

		$('#startDateInput').datepicker("setDate", new Date()).on('show', () => {
			// $('.datepicker').css('transform', 'translateY(200px)');
		});
		$('#endDateInput').datepicker("setDate", new Date()).on('show', () => {
			// $('.datepicker').css('transform', 'translateY(40px)');
		});

	})

};

rhit.main();




