/**
 * Copyright (c) 2016 Jan Kirchner.
 *
 * simple-mongo-timeseries
 *
 * A simple timeseries module for mongodb.
 */
var Q = require('q');
var moment = require('moment');
var keyBuilderFactory = require('./mongoTSKeys.js').KeyBuilderFactory();

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'jk.smts.write'});

exports = module.exports = mongoTSWrite;

function mongoTSWrite(config) {


    var storeReading = function (sensor, value, time) {

        log.debug({ts: time, sensor: sensor, value: value}, 'storeReading');

        time = time || new Date();

        var keyBuilder = keyBuilderFactory.fromNameAndDate(sensor, time);
        var key = keyBuilder.buildReadingString();
        var expireDate = moment(keyBuilder.getPeriod()).add(1, 'd').toDate();

        var deferred = Q.defer();

        config.getCollection().updateOne(
            {
                _id: key
            },
            {
                $inc: {num_samples: 1, total_samples: value},
                $min: {min_samples: value},
                $max: {max_samples: value},
                $set: {expireAt: expireDate}
            },
            {
                upsert: true
            },
            function (err) {

                if (err) {
                    deferred.reject(new Error(err));
                } else {
                    deferred.resolve(key);
                }
            }
        );

        return deferred.promise;
    };

    var reset = function () {

        var deferred = Q.defer();

        config.getCollection().drop(function (err, result) {
            if (err) {
                log.error(err, 'Resetting failed.');
                deferred.reject(new Error(err));
            } else {
                log.info(result, 'Resetting done.');
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    };


    var that = {};

    that.reset = reset;
    that.storeReading = storeReading;

    return that;
}

