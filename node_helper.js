/* Magic Mirror
 * Module: MMM-Traffic-Multi
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * Multiple Route Support By Bryn Dole https://github.com/randomstring/
 * MIT Licensed.
 */

var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create({
  start: function () {
    console.log('MMM-Traffic-Multi helper started ...');
  },

  getCommute: function(route) {
      var self = this;
      
      if (this.verbose) {
	  console.log('MMM-Traffic-Multi: request ' + route.id + ' ' + route.route_name);
	  console.log('MMM-Traffic-Multi: url ' + route.url);
      }
      
      request({url: route.url + "&departure_time=now", method: 'GET'}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var trafficComparison = 0;
	    if((JSON.parse(body).status)=='OVER_QUERY_LIMIT') {
		console.log("API-Call Quote reached for today -> no more calls until 0:00 PST");
	    }
	    else {
		if (JSON.parse(body).routes[0].legs[0].duration_in_traffic) {
		    route.commute = JSON.parse(body).routes[0].legs[0].duration_in_traffic.text;
		    route.noTrafficValue = JSON.parse(body).routes[0].legs[0].duration.value;
		    route.withTrafficValue = JSON.parse(body).routes[0].legs[0].duration_in_traffic.value;
		    route.trafficComparison = parseInt(route.withTrafficValue)/parseInt(route.noTrafficValue);
		} else {
		    route.commute = JSON.parse(body).routes[0].legs[0].duration.text;
		}
		route.summary = JSON.parse(body).routes[0].summary;
		if (this.verbose) {
		    console.log('MMM-Traffic-Multi: reply ' + route.id + ' ' + route.commute);
		}
		self.sendSocketNotification('TRAFFIC_COMMUTE', route);
	    }
	}
    });
  },

  getTiming: function(route) {
      var self = this;
      var newTiming = 0;
      request({url: route.url + "&departure_time=now", method: 'GET'}, function(error, response, body) {
		  if (!error && response.statusCode == 200) {
		      var durationValue = JSON.parse(body).routes[0].legs[0].duration.value;
		      newTiming = self.timeSub(route.arrival_time, durationValue, 0);
		      self.getTimingFinal(route, newTiming, route.arrival_time);
		  }
	      });
  },

  getTimingFinal: function(route, newTiming, arrivalTime) {
    var self = this;
    request({url: route.url + "&departure_time=" + newTiming, method: 'GET'}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        if (JSON.parse(body).routes[0].legs[0].hasOwnProperty('duration_in_traffic')) {
          route.trafficValue = JSON.parse(body).routes[0].legs[0].duration_in_traffic.value;
        } else {
          route.trafficValue = JSON.parse(body).routes[0].legs[0].duration.value;
        }
        route.summary = JSON.parse(body).routes[0].summary;
        route.leaveBy = self.timeSub(arrivalTime, route.trafficValue, 1);
        self.sendSocketNotification('TRAFFIC_TIMING', route);
      }
    });

  },

  timeSub: function(arrivalTime, durationValue, lookPretty) {
    var currentDate = new Date();
    var nowY = currentDate.getFullYear();
    var nowM = (currentDate.getMonth() + 1).toString();
    if (nowM.length == 1) {
      nowM = "0" + nowM;
    }
    var nowD = currentDate.getDate();
    nowD = nowD.toString();
    if (nowD.length == 1) {
      nowD = "0" + nowD;
    }
    var nowH = arrivalTime.substr(0,2);
    var nowMin = arrivalTime.substring(2,4);
    var testDate = new Date(nowY + "-" + nowM + "-" + nowD + " " + nowH + ":" + nowMin + ":00");
    if (lookPretty == 0) {
      if (currentDate >= testDate) {
        var goodDate = new Date (testDate.getTime() + 86400000 - (durationValue*1000)); // Next day minus uncalibrated duration
        return Math.floor(goodDate / 1000);
      } else {
	      var goodDate = new Date (testDate.getTime() - (durationValue*1000)); // Minus uncalibrated duration
        return Math.floor(testDate / 1000);
      }
    } else {
      var finalDate = new Date (testDate.getTime() - (durationValue * 1000));
      var finalHours = finalDate.getHours();
      finalHours = finalHours.toString();
      if (finalHours.length == 1) {
        finalHours = "0" + finalHours;
      }
      var finalMins = finalDate.getMinutes();
      finalMins = finalMins.toString();
      if (finalMins.length == 1) {
        finalMins = "0" + finalMins;
      }
      return finalHours + ":" + finalMins;
    }
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, route) {
      if (notification === 'TRAFFIC_URL') {
	  this.getCommute(route);
      } else if (notification === 'LEAVE_BY') {
	  this.getTiming(route);
      }
  }

});
