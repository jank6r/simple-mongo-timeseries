/**
 * Copyright (c) 2016 Jan Kirchner.
 *
 * simple-mongo-timeseries
 *
 * A simple timeseries module for mongodb.
 */
var mongodb = require('mongodb');
var Q = require('q');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'jk.smts'});

var mongoTSAggregation = require('./mongoTSAggregation.js');
var mongoTSWrite = require('./mongoTSWrite.js');
var mongoTSRead = require('./mongoTSRead.js');

exports = module.exports = simpleMongoTS;

function simpleMongoTS(options) {

    var setupTTLIndex = function (db, collectionName) {
        var collection = db.collection(collectionName);
        collection.ensureIndex({'expireAt': 1}, {expireAfterSeconds: 0}).then(function (result) {
            log.info(result, 'Created TTL Index');
        });
    };

    var connect = function () {
        var deferred = Q.defer();

        mongodb.MongoClient.connect(options.connectionString, function (err, database) {
            if (err) {
                log.error('Unable to connect to the mongoDB server. Error:', err);
                setTimeout(connect, 10000);
            } else {
                log.info('Connection established to', options.connectionString);
                deferred.resolve(assembleAPI(options, database));
                setupTTLIndex(database, options.collection);
            }
        });

        return deferred.promise;
    };

    var that = {};

    that.connect = connect;

    return that;
}

function assembleAPI(options, db) {

    var close = function () {

        var deferred = Q.defer();

        db.close(true, function (err, result) {
            if (err) {
                log.error(err, 'Closing connection failed.');
                deferred.reject(new Error(err));
            } else {
                log.info(result, 'Connection closed.');
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    };

    var getCollection = function () {
        return db.collection(options.collection);
    };

    var moduleConfig = {getCollection: getCollection};

    var mtsAggr = mongoTSAggregation(moduleConfig);
    var mtsWrt = mongoTSWrite(moduleConfig);
    var mtsRd = mongoTSRead(moduleConfig);

    var that = {};

    that.close = close;

    that.aggregateSensor = mtsAggr.aggregateSensor;

    that.storeReading = mtsWrt.storeReading;
    that.reset = mtsWrt.reset;

    that.selectLastSample = mtsRd.selectLastSample;
    that.selectSamples = mtsRd.selectSamples;
    that.selectAggregationByHour = mtsRd.selectAggregationByHour;
    that.selectAggregationBy10Min = mtsRd.selectAggregationBy10Min;



    return that;
}







