/**
 * Copyright (c) 2016 Jan Kirchner.
 *
 * simple-mongo-timeseries
 *
 * A simple timeseries module for mongodb.
 */
var Q = require('q');
var keyBuilderFactory = require('./mongoTSKeys.js').KeyBuilderFactory();

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'jk.smts.aggregate'});

exports = module.exports = mongoTSAggregation;


function mongoTSAggregation(config) {

    var storeAggregation = function (key, hourlyData) {

        var deferred = Q.defer();

        var updateData = {updated: new Date()};
        updateData['hours.' + hourlyData.hour] = hourlyData;

        config.getCollection().updateOne(
            {
                _id: key.buildAggregationString(),

            },
            {
                $set: updateData
            },
            {
                upsert: false
            },
            function (err, results) {

                if (err) {
                    deferred.reject(new Error(err));
                } else {

                    if (results.result.n === 0) {
                        allocateAggragation(key, hourlyData).then(function (key) {
                            deferred.resolve(key);
                        });
                    } else {
                        deferred.resolve(key);
                    }
                }
            }
        );

        return deferred.promise;
    };

    var allocateAggragation = function (key, value) {

        var deferred = Q.defer();
        var hour = key.getHour();

        var updateData = {
            _id: key.buildAggregationString(),
            updated: new Date(), hours: []
        };

        for (i = 0; i < 24; i++) {
            var allocationObj = {'hour': i, 'value': null, 'min': null, 'max': null, 'detail': []};
            for (j = 0; j < 6; j++) {
                allocationObj.detail.push({id: null, value: null, min: null, max: null});
            }

            updateData.hours[i] = allocationObj;
        }

        updateData.hours[parseInt(hour)] = value;


        config.getCollection().insertOne(updateData, function (err, results) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(key);
            }
        });

        return deferred.promise;
    };


    var aggregateHour = function (key) {

        var deferred = Q.defer();
        var keyLength = key.getSensor().length;

        config.getCollection().aggregate(
            [
                {$match: {'_id': key.buildRegex()}},
                {
                    $project: {
                        'average': {$divide: ['$$CURRENT.total_samples', '$$CURRENT.num_samples']},
                        'min_samples': 1,
                        'max_samples': 1
                    }
                },
                {
                    $group: {
                        '_id': {$substr: ['$$CURRENT._id', 0, keyLength + 12]},
                        'average1': {$avg: '$$CURRENT.average'},
                        'min': {$min: '$$CURRENT.min_samples'},
                        'max': {$max: '$$CURRENT.max_samples'},
                        count: {$sum: 1}
                    }
                },
                {
                    $group: {
                        '_id': {$substr: ['$$CURRENT._id', 0, keyLength + 11]},
                        'value': {$avg: '$$CURRENT.average1'},
                        'min': {$min: '$$CURRENT.min'},
                        'max': {$max: '$$CURRENT.max'},
                        'detail': {
                            $push: {
                                id: {$substr: ['$$CURRENT._id', keyLength + 11, -1]},
                                value: '$$CURRENT.average1',
                                min: '$$CURRENT.min',
                                max: '$$CURRENT.max'
                            }
                        }
                    }
                }
            ]
        ).toArray(function (err, result) {

                if (err) {
                    deferred.reject(new Error(err));
                } else {

                    if (result.length === 0) {
                        deferred.resolve(keyBuilderFactory.increaseHour(key));
                    } else {

                        result.forEach(function (item) {

                            var hourlyData = {
                                hour: parseInt(key.getHour()),
                                value: item.value,
                                min: item.min,
                                max: item.max,
                                detail: item.detail
                            };

                            storeAggregation(key, hourlyData).then(function (key) {
                                    deferred.resolve(keyBuilderFactory.increaseHour(key));
                                }
                            );
                        });
                    }
                }
            });

        return deferred.promise;
    };


    var aggregateMissingHoursUntil = function (cursor, until, deferred) {

        if (until(cursor)) {

            aggregateHour(cursor).then(
                function (resultKey) {
                    aggregateMissingHoursUntil(resultKey, until, deferred);
                }
            ).done();
        } else {
            log.info({'sensor': cursor.getSensor()},'aggregation done');
            deferred.resolve(true);
        }
    };

    var determineStart = function (keyBuilder) {
        var deferred = Q.defer();
        var regex = keyBuilder.buildRegexAllAggregations();

        config.getCollection().find({_id: regex}).sort({_id: -1}).limit(1).next(function (err, doc) {
            if (err) {
                deferred.reject(new Error(err));
            } else {

                if (doc) {
                    deferred.resolve(keyBuilderFactory.fromKeyString(doc._id));
                } else {
                    var queryFirstData = {$query: {_id: keyBuilder.buildRegexAllReadings()}, $orderby: {_id: 1}};
                    config.getCollection().findOne(queryFirstData, function (innerErr, innerDoc) {
                        if (innerErr) {
                            deferred.reject(new Error(innerErr));
                        } else {
                            if (innerDoc) {
                                deferred.resolve(keyBuilderFactory.fromKeyString(innerDoc._id));
                            } else {
                                deferred.resolve(keyBuilderFactory.fromNameAndDate(keyBuilder.getSensor(), new Date()));
                            }
                        }
                    });
                }
            }

        });

        return deferred.promise;
    };

    var determineEnd = function (keyBuilder) {
        var deferred = Q.defer();

        var queryLastData = {_id: keyBuilder.buildRegexAllReadings()};

        config.getCollection().find(queryLastData).sort({_id: -1}).limit(1).next(function (err, document) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                if (document) {
                    deferred.resolve(keyBuilderFactory.fromKeyString(document._id));
                } else {
                    deferred.resolve(keyBuilderFactory.fromNameAndDate(keyBuilder.getSensor(), new Date()));
                }
            }

        });

        return deferred.promise;
    };

    var aggregateSensor = function (sensor) {
        var deferred = Q.defer();

        var keyBuilder = keyBuilderFactory.fromNameAndDate(sensor, new Date());

        Q.all([determineStart(keyBuilder), determineEnd(keyBuilder)]).then(
            function (result) {

                var startDate = result[0].getPeriod();
                var endDate = result[1].getPeriod();

                log.info({'sensor': sensor, 'from': startDate, 'to': endDate}, 'aggregation start');

                var cursor = keyBuilderFactory.fromNameAndDate(sensor, startDate);

                var until = function (currentKey) {
                    return currentKey.getPeriod() <= endDate;
                };

                aggregateMissingHoursUntil(cursor, until, deferred);
            }
        );

        return deferred.promise;
    };

    var that = {};

    that.aggregateSensor = aggregateSensor;

    return that;

}
