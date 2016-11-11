/* global Module */

/* Magic Mirror
 * Module: MMM-Traffic-Multi
 *
 * Original By Sam Lewis https://github.com/SamLewis0602
 * Multiple Route Support By Bryn Dole https://github.com/randomstring/
 * MIT Licensed.
 */

Module.register('MMM-Traffic-Multi', {

    defaults: {
        api_key: '',
        mode: 'driving',
        interval: 900000, // 15minutes. all modules use milliseconds
        origin: '',
        destination: '',
        traffic_model: 'best_guess',
        departure_time: 'now',
        arrival_time: '',
        loadingText: 'Loading commute...',
        prependText: 'Current commute is',
        changeColor: false,
        limitYellow: 10,
        limitRed: 30,
        showGreen: true,
        symbols: {
	    'driving': 'fa fa-car',
	    'walking': 'fa fa-odnoklassniki',
	    'bicycling': 'fa fa-bicycle',
	    'transit': 'fa fa-train'
        },
        language: config.language,
        show_summary: true,
	verbose: false
    },

    start: function() {
        Log.info('Starting module: ' + this.name);
        if (this.data.classes === 'MMM-Traffic-Multi') {
            this.data.classes = 'bright medium';
        }
	if (! this.config.routes instanceof Array) {
	    this.config.routes = [ this.config.routes ]; 
	}

	if (this.verbose) {
            Log.info('MMM-Traffic: total routes =' + this.config.routes.length);
	}

	for (var i=0; i < this.config.routes.length; i++) {
	    var route = this.config.routes[i];
	    route.id = i;
            route.loaded = false;
            route.leaveBy = '';

	    /* set defaults from config: mode, traffic_model, arrival_time */
	    if (! route.hasOwnProperty('mode') ) {
		route.mode = this.config.mode;
	    }
	    if (! route.hasOwnProperty('traffic_model') ) {
		route.traffic_model = this.config.traffic_model;
	    }
	    if (! route.hasOwnProperty('arrival_time') ) {
		route.arrival_time = this.config.arrival_time;
	    }
	    if (! route.hasOwnProperty('show_summary') ) {
		route.show_summary = this.config.show_summary;
	    }

	    route.url = encodeURI('https://maps.googleapis.com/maps/api/directions/json' + 
				   this.getParams(this.config, route));

	    if (this.verbose) {
		Log.info('MMM-Traffic-Multi: adding new route:' + route.route_name);
	    }

            route.commute = '';
            route.summary = '';
	}
        this.updateCommute(this);
    },

    updateCommute: function(self) {
	for (var i=0; i < this.config.routes.length; i++) {
	    var route = this.config.routes[i];
            if (route.arrival_time.length == 4) {
		self.sendSocketNotification('LEAVE_BY', route);
            } else {
		self.sendSocketNotification('TRAFFIC_URL', route);
            }
	}
        setTimeout(self.updateCommute, self.config.interval, self);
    },

    getStyles: function() {
        return ['traffic.css', 'font-awesome.css'];
    },

    getDom: function() {
        var meta_wrapper = document.createElement("div");

	for (var i=0; i < this.config.routes.length; i++) {
	    var route = this.config.routes[i];
            var wrapper = document.createElement("div");
            var commuteInfo = document.createElement('div'); //support for config.changeColor
	    
            if (!route.loaded) {
		wrapper.innerHTML = this.config.loadingText;
            }
	    else {
		//symbol
		var symbol = document.createElement('span');
		symbol.className = this.config.symbols[route.mode] + ' symbol';
		commuteInfo.appendChild(symbol);

		if (route.arrival_time == '') {
		    //commute time
		    var trafficInfo = document.createElement('span');
		    trafficInfo.innerHTML = this.config.prependText + ' ' + route.commute;
		    commuteInfo.appendChild(trafficInfo);
		    
		    //change color if desired and append
		    if (this.config.changeColor) {
			if (this.trafficComparison >= 1 + (this.config.limitRed / 100)) {
			    commuteInfo.className += ' red';
			} else if (this.trafficComparison >= 1 + (this.config.limitYellow / 100)) {
			    commuteInfo.className += ' yellow';
			} else if (this.config.showGreen) {
			    commuteInfo.className += ' green';
			}
		    }
		    wrapper.appendChild(commuteInfo);
		    
		    //routeName
		    if (route.route_name) {
			var routeName = document.createElement('div');
			routeName.className = 'dimmed small';
			if (route.summary.length > 0 && route.show_summary){
			    routeName.innerHTML = route.route_name + ' via ' + route.summary; //todo translatable?
			} else {
			    routeName.innerHTML = route.route_name;
			}
			wrapper.appendChild(routeName);
		    }
		} else {
		    //leave-by time
		    var trafficInfo = document.createElement('span');
		    trafficInfo.innerHTML = "Leave by " + route.leaveBy;
		    commuteInfo.appendChild(trafficInfo);
  		    wrapper.appendChild(commuteInfo);
		    
		    //routeName
		    if (route.route_name) {
			var routeName = document.createElement('div');
			routeName.className = 'dimmed small';
			if (route.summary.length > 0 && route.show_summary){
			    routeName.innerHTML = route.route_name + ' via ' + route.summary + " to arrive by " + route.arrival_time.substring(0,2) + ":" + route.arrival_time.substring(2,4);
			} else {
			    console.log(typeof route.arrival_time );
			    routeName.innerHTML = route.route_name + " to arrive by " + route.arrival_time.substring(0,2) + ":" + route.arrival_time.substring(2,4);
			}
			wrapper.appendChild(routeName);
		    }
		}
	    }
	    meta_wrapper.appendChild(wrapper);
	    
        }
        return meta_wrapper;
    },

    getParams: function(config,route) {
        var params = '?';
        params += 'mode=' + route.mode;
        params += '&origin=' + route.origin;
        params += '&destination=' + route.destination;
        params += '&key=' + config.api_key;
        params += '&traffic_model=' + route.traffic_model;
        params += '&language=' + config.language;
        return params;
    },

    socketNotificationReceived: function(notification, route) {
	if (this.verbose) {
	    Log.info('MMM-Traffic-Multi: received ' + notification + ' for ' + route.route_name);
	}
        route.loaded = true;
	this.config.routes[route.id] = route;
        this.updateDom(1000);
    }

});
