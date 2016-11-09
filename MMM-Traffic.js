/* global Module */

/* Magic Mirror
 * Module: MMM-Traffic
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * MIT Licensed.
 */

Module.register('MMM-Traffic', {

    defaults: {
        api_key: '',
        mode: 'driving',
        interval: 300000, //all modules use milliseconds
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
        show_summary: true
    },

    start: function() {
        Log.info('Starting module: ' + this.name);
        if (this.data.classes === 'MMM-Traffic') {
            this.data.classes = 'bright medium';
        }
	if (! this.config.routes instanceof Array) {
	    this.config.routes = [ this.config.routes ]; 
	}

        Log.info('MMM-Traffic: total routes = ' + this.config.routes.length);

	for (var i=0; i < this.config.routes.length; i++) {
	    var route = this.config.routes[i];
	    route.id = i;
            route.loaded = false;
            route.leaveBy = '';

	    /* set defaults from config: mode, traffic_model, arrival_time */
	    if (! route.hasOwnProperty(route.mode) ) {
		route.mode = this.config.mode;
	    }
	    if (! route.hasOwnProperty(route.traffic_model) ) {
		route.traffic_model = this.config.traffic_model;
	    }
	    if (! route.hasOwnProperty(route.arrival_time) ) {
		route.arrival_time = this.config.arrival_time;
	    }
	    if (! route.hasOwnProperty(route.show_summary) ) {
		route.show_summary = this.config.show_summary;
	    }

	    route.url = encodeURI('https://maps.googleapis.com/maps/api/directions/json' + 
				   this.getParams(this.config, route));

            Log.info('MMM-Traffic: new route:' + route.route_name);

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
		symbol.className = this.symbols[route.mode] + ' symbol';
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
		    trafficInfo.innerHTML = "Leave by " + this.leaveBy;
		    commuteInfo.appendChild(trafficInfo);
  		    wrapper.appendChild(commuteInfo);
		    
		    //routeName
		    if (route.route_name) {
			var routeName = document.createElement('div');
			routeName.className = 'dimmed small';
			if (this.summary.length > 0 && route.show_summary){
			    routeName.innerHTML = route.route_name + ' via ' + this.summary + " to arrive by " + route.arrival_time.substring(0,2) + ":" + route.arrival_time.substring(2,4);
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
        return wrapper;
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
        route.leaveBy = '';
        if (notification === 'TRAFFIC_COMMUTE') {
            Log.info('received TRAFFIC_COMMUTE for' + route.name );
            route.commute = payload.commute;
            route.summary = payload.summary;
            route.trafficComparison = payload.trafficComparison;
            route.loaded = true;
        } else if (notification === 'TRAFFIC_TIMING') {
            Log.info('received TRAFFIC_TIMING for ' + route.name);
            route.leaveBy = payload.commute;
            route.summary = payload.summary;
            route.loaded = true;
        }
        this.updateDom(1000);
    }

});
