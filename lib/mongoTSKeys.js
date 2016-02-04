/**
 * Copyright (c) 2016 Jan Kirchner.
 *
 * simple-mongo-timeseries
 *
 * A simple timeseries module for mongodb.
 */
var moment = require('moment');

exports.KeyBuilderFactory = function () {

    var typeAggregation = 'A';
    var typeReading = 'R';

    var keybuilder = function (sensor, period) {

        if (!sensor || sensor.length < 1) {
            throw new Error( 'Invalid sensor name! Must not be null or empty.');
        }

        if (sensor.match(/[^A-Za-z0-9_]/)) {
            throw new Error( 'Invalid sensor name! Only word characters allowed.');
        }

        var that = {};

        that.buildReadingString = function () {
            return sensor + ':' + typeReading + ':' + period.format('YYMMDDHHmm');
        };

        that.buildAggregationString = function () {
            return sensor + ':' + typeAggregation + ':' + period.format('YYMMDD');
        };

        that.buildRegex = function () {
            return new RegExp('^' + sensor + ':' + typeReading + ':' + period.format('YYMMDDHH'));
        };

        that.buildRegexAllReadings = function () {
            return new RegExp('^' + sensor + ':' + typeReading + ':');
        };

        that.buildRegexAllAggregations = function () {
            return new RegExp('^' + sensor + ':' + typeAggregation + ':');
        };

        that.getSensor = function () {
            return sensor;
        };

        that.getPeriod = function () {
            return period.toDate();
        };

        that.getHour = function() {
            return parseInt(period.format('H'));
        };

        that.getDecimalMin = function() {
            return Math.floor(parseInt(period.format('m')) / 10);
        };

        that.getDayTimestamp = function() {
            return period.hour(0).minute(0).second(0).millisecond(0).unix();
        };

        return that;
    };

    var factory = {
        fromKeyString: function (str) {
            var parts = str.split(':');

            var sensorName = parts[0];
            var period = moment(parts[2], 'YYMMDDHHmm');

            return keybuilder(sensorName, period);
        },
        fromNameAndDate: function (sensorName, date) {
            return keybuilder(sensorName, moment(date));
        },
        increaseHour: function (keyBuilder) {
            var newDate = moment(keyBuilder.getPeriod()).add(1, 'H').toDate();
            return this.fromNameAndDate(keyBuilder.getSensor(), newDate);
        }
    };

    return factory;
};



