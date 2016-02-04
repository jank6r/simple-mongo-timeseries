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

exports = module.exports = mongoTSRead;

function mongoTSRead(config) {


    var convertReadingData = function (sensor, documents) {
        var data = documents.map(function (item) {

            var tmpKey = keyBuilderFactory.fromKeyString(item._id);

            return {
                time: tmpKey.getPeriod(),
                value: (item.total_samples / item.num_samples),
                min: item.min_samples,
                max: item.max_samples
            };
        });

        return {
            sensor: sensor,
            data: data
        };
    };

    var buildAggregationQuery = function (fromKeyBuilder, toKeyBuilder) {

        return {
            $and: [
                {_id: fromKeyBuilder.buildRegexAllAggregations()},
                {_id: {$gte: fromKeyBuilder.buildAggregationString()}},
                {_id: {$lte: toKeyBuilder.buildAggregationString()}}
            ]
        };
    };

    var selectAggregationByHour = function (sensor, fromDate, toDate) {
        var deferred = Q.defer();

        toDate = toDate || new Date();

        var fromKeyBuilder = keyBuilderFactory.fromNameAndDate(sensor, fromDate);
        var toKeyBuilder = keyBuilderFactory.fromNameAndDate(sensor, toDate);

        var query = buildAggregationQuery(fromKeyBuilder, toKeyBuilder);


        config.getCollection().aggregate(
            [
                {$match: query},
                {$project: {ts: 1, hours: 1}},
                {$unwind: '$hours'},
                {
                    $project: {
                        ts: {$add: ['$$CURRENT.ts', {$multiply: ['$$CURRENT.hours.hour', 3600]}]},
                        value: '$$CURRENT.hours.value',
                        min: '$$CURRENT.hours.min',
                        max: '$$CURRENT.hours.max'
                    }
                },
                {
                    $match: {
                        $and: [
                            {value: {$not: {$type: 10}}},
                            {ts: {$gte: moment(fromDate).unix()}},
                            {ts: {$lte: moment(toDate).unix()}}
                        ]
                    }
                },
                {$sort: {ts: 1}}
            ])
            .toArray(function (err, documents) {
                if (err) {
                    deferred.reject(new Error(err));
                } else {

                    var data = documents.map(function (item) {

                        return {
                            time: moment.unix(item.ts).toDate(),
                            value: item.value,
                            min: item.min,
                            max: item.max
                        };
                    });

                    deferred.resolve({
                        sensor: sensor,
                        data: data
                    });

                }
            });

        return deferred.promise;
    };


    var selectAggregationBy10Min = function (sensor, fromDate, toDate) {
        var deferred = Q.defer();

        toDate = toDate || new Date();

        var fromKeyBuilder = keyBuilderFactory.fromNameAndDate(sensor, fromDate);
        var toKeyBuilder = keyBuilderFactory.fromNameAndDate(sensor, toDate);

        var query = buildAggregationQuery(fromKeyBuilder, toKeyBuilder);

        config.getCollection().aggregate(
            [
                {$match: query},
                {$project: {hours: 1, ts: 1}},
                {$unwind: '$hours'},
                {
                    $project: {
                        ts: {$add: ['$$CURRENT.ts', {$multiply: ['$$CURRENT.hours.hour', 3600]}]},
                        hour: '$$CURRENT.hours.hour',
                        hourDetail: '$$CURRENT.hours.detail'
                    }
                },
                {$unwind: '$hourDetail'},

                {
                    $project: {
                        ts: {$add: ['$$CURRENT.ts', {$multiply: ['$$CURRENT.hourDetail.id', 600]}]},
                        value: '$$CURRENT.hourDetail.value',
                        min: '$$CURRENT.hourDetail.min',
                        max: '$$CURRENT.hourDetail.max'
                    }
                },
                {
                    $match: {
                        $and: [
                            {value: {$not: {$type: 10}}},
                            {ts: {$gte: moment(fromDate).unix()}},
                            {ts: {$lte: moment(toDate).unix()}}
                        ]
                    }
                },
                {$sort: {ts: 1}}

            ])
            .toArray(function (err, documents) {
                if (err) {
                    deferred.reject(new Error(err));
                } else {

                    var data = documents.map(function (item) {

                        return {
                            time: moment.unix(item.ts).toDate(),
                            value: item.value,
                            min: item.min,
                            max: item.max
                        };
                    });

                    deferred.resolve({
                        sensor: sensor,
                        data: data
                    });
                }
            });


        return deferred.promise;
    };


    var selectLastSample = function (sensor) {
        var deferred = Q.defer();

        var keyBuilder = keyBuilderFactory.fromNameAndDate(sensor, new Date());
        var queryLastData = {_id: keyBuilder.buildRegexAllReadings()};

        config.getCollection().find(queryLastData).sort({_id: -1}).limit(1).toArray(function (err, documents) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(convertReadingData(sensor, documents));
            }
        });

        return deferred.promise;
    };

    var selectSamples = function (sensor, fromDate, toDate) {
        var deferred = Q.defer();

        var keyBuilder = keyBuilderFactory.fromNameAndDate(sensor, fromDate);
        var query = {
            $and: [
                {_id: keyBuilder.buildRegexAllReadings()},
                {_id: {$gte: keyBuilder.buildReadingString()}}
            ]
        };

        if (toDate) {
            var toKeyBuilder = keyBuilderFactory.fromNameAndDate(sensor, toDate);
            query.$and.push({_id: {$lt: toKeyBuilder.buildReadingString()}});
        }

        config.getCollection().find(query).sort({_id: -1}).limit(60).toArray(function (err, documents) {
            if (err) {
                deferred.reject(new Error(err));
            } else {

                deferred.resolve(convertReadingData(sensor, documents));
            }
        });

        return deferred.promise;
    };


    var that = {};

    that.selectLastSample = selectLastSample;
    that.selectSamples = selectSamples;
    that.selectAggregationByHour = selectAggregationByHour;
    that.selectAggregationBy10Min = selectAggregationBy10Min;

    return that;
}
