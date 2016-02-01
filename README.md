# Simple Mongo Timeseries

**A simple timeseries module for mongodb**


This module is a time series layer on top of mongodb. The implementation was generally inspired by a post on the mongodb blog: http://blog.mongodb.org/post/65517193370/schema-design-for-time-series-data-in-mongodb

**Example Usage:**

```js
var smts = require('simple-mongo-timeseries');

var options = {
    connectionString: 'mongodb://localhost:27017/test',
    collection: 'timeseries'
};

var promise = smts(options).connect();

promise.then(function(mongoTS) {
  mongoTS.storeReading('sensor', 123.45, new Date());
});
```

## Current Status

_Experimental_ - I started this project mainly to become acquainted the mongodb node api.

## Installation

```sh
npm install git+https://github.com/ianusmagnus/simple-mongo-timeseries.git
```

## Features

- Stores sample from one or many sensor in a mongodb collection
- The time granularity of sample data is one minute. The average is automatically calculated for all data collected within one minute.
- 60 documents are needed per sensor and hour.
- Sample data are cleared automatically by the TTL feature of mongodb.
- Sample data can be aggregated by 10 minutes and 1 hour.
- Only one document pre sensor needed to store the aggregated data of one day.

## Introduction

### Initializing

The mongodb connection string is the only required configuration parameter to initialize this module.
```js
var smts = require('simple-mongo-timeseries');

var options = {
     connectionString: 'mongodb://localhost:27017/test',  // required
     collection: 'timeseries'       // optional
   };

var promise = smts(options).connect();

promise.then(function(mongoTS) {
  ... do stuff ...
});
```

### Write data

To store a sample of a sensor a name and a numeric value must be provided.

```js
var sensorname = 'temperature';
var sensordata = 25.5; // numeric data
var time = new Date();  // optional, default 'new Date()'

mongoTS.storeReading(sensorname, sensordata, time);
```

This creates a new or updated a existing document in the mongodb collection.
All samples collected within a minute are stored in the one document.

Example document for sample data:

```js
{
    "_id" : "temperature:R:1602011625",
    "num_samples" : 17,
    "total_samples" : 433,5,
    "min_samples" : 28.1,
    "max_samples" : 22.9,
    "expireAt" : ISODate("2016-02-02T15:25:55.369Z")
}
```

### Aggregate data

The aggregation can be triggered manually, but it only needs to be done every 10 minutes.

```js
var sensorname = 'temperature';

mongoTS.aggregateSensor(sensorname)
```

One document is generated per sensor and day.

On the first write the document will be initialized with null values. This prevents it from growing and being moved when
it exceeds the current space allocated to it. Because this write operations are relatively expensive, especially if they happen frequently.

Example document for aggregated data:

```js
{
    "_id": "temperature:A:160201",
    "updated":ISODate("2016-02-01T15:52:11.260Z"),
    "hours": [{
        "hour": 0,
        "value": null,
        "min": null,
        "max": null,
        "detail": [
            {"id": null, "value": null, "min": null, "max": null},
            {"id": null,"value": null, "min": null,"max": null},
            {"id": null, "value": null, "min": null, "max": null},
            { "id": null, "value": null, "min": null, "max": null},
            {"id": null, "value": null, "min": null, "max": null},
            {"id": null, "value": null, "min": null, "max": null}
        ]
    },
...
....
        {
        "hour": 16,
        "value": 25.5,
        "min": 25.5,
        "max": 25.5,
        "detail": [
            {"id": "0", "value": 25.9, "min": 30.0, "max": 20.4},
            {"id": "1", "value": 27.8, "min": 30.5, "max": 21.7},
            {"id": "2", "value": 24.7, "min": 31.5, "max": 20.8},
            {"id": "3", "value": 28.3, "min": 30.2, "max": 25.9},
            {"id": "4", "value": 22.9, "min": 32.5, "max": 20.0},
            {"id": "5", "value": 25.3, "min": 30.9, "max": 22.1}
        ]
    },
    ....
    ....
    ...
    {
        "hour": 23,
        "value": null,
        "min": null,
        "max": null,
        "detail": [
            {"id": null, "value": null, "min": null, "max": null},
            {"id": null,"value": null, "min": null,"max": null},
            {"id": null, "value": null, "min": null, "max": null},
            { "id": null, "value": null, "min": null, "max": null},
            {"id": null, "value": null, "min": null, "max": null},
            {"id": null, "value": null, "min": null, "max": null}
        ]
    }]
  }
```
### Read data

#### Last sample

Query the last written sample. Average value for the last minute.

```js
var sensorname = 'temperature';

mongoTS.selectLastSample(sensorname).then(function(result) {
    console.log(result);
}).done();
```

Example result:
```js
{
    sensor: 'temperature',
    data:
   [{
    time: Mon Feb 01 2016 16:25:00 GMT+0100 (CET),
    value: 25.5,
    min: 25.8,
    max: 25.3 }
    ]}
```

#### Samlpe data

Query sample data. Depending on the TTL settings this data is only available until a specific time in the past.

```js
var sensorname = 'temperature';
var from = new Date('2016-02-01T13:24:00');
var to = new Date('2016-02-01T23:14:00');  // optional, default 'new Date()'

mongoTS.selectSamples(sensorname, from, to).then(function(result) {
    console.log(result);
}).done();
```
Example result:

```js
{
    sensor: 'temperature',
    data: [
        ....
        {
            time: Mon Feb 01 2016 16:46:00 GMT+0100 (CET),
            value: 26.3,
            min: 25.5,
            max: 27.1
        },
        {
            time: Mon Feb 01 2016 16:45:00 GMT+0100 (CET),
            value: 25.8,
            min: 25.1,
            max: 25.9
         },
        ....
        ]
}
```

#### Aggregation by 10 minutues

Query data aggregated by 10 minutes.

```js
var sensorname = 'temp0001';
var from = new Date('2016-02-01T13:00:00');
var to = new Date('2016-02-01T15:14:00');  // optional, default 'new Date()'

mongoTS.selectAggregationBy10Min(sensorname, from,to).then(function(result) {
    console.log(result);
}).done();
```

Example result:

```js
{
    sensor: 'temperature',
    data:[
        ...
        {
            time: Mon Feb 01 2016 15:10:00 GMT+0100 (CET),
            value: 18.167419922200608,
            min: 18.12,
            max: 18.21
        },
        {
            time: Mon Feb 01 2016 15:20:00 GMT+0100 (CET),
            value: 18.15815732147818,
            min: 18.1,
            max: 18.21
        },
        {
            time: Mon Feb 01 2016 15:30:00 GMT+0100 (CET),
            value: 18.1594133185144,
            min: 18.1,
            max: 18.22
        },
        ....
        ]
}
```

#### Aggregation by 1 hour

Query data aggregated by 10 minutes.

```js
var sensorname = 'temp0001';
var from = new Date('2016-02-01T13:00:00');
var to = new Date('2016-02-01T15:14:00');  // optional, default 'new Date()'

mongoTS.selectAggregationBy10Min(sensorname, from,to).then(function(result) {
    console.log(result);
}).done();
```

Example result:

```js
{
sensor: 'temperature',
data:[
    ...
    {
        time: Mon Feb 01 2016 13:00:00 GMT+0100 (CET),
        value: 18.188824097135313,
        min: 17.92,
        max: 18.4
    },
    {
        time: Mon Feb 01 2016 14:00:00 GMT+0100 (CET),
        value: 18.298938151144924,
        min: 18.16,
        max: 18.44 },
    {
        time: Mon Feb 01 2016 15:00:00 GMT+0100 (CET),
        value: 18.147626267269686,
        min: 18.03,
        max: 18.24
    },
      ....
    ]
}
```

# Versioning

This module is maintained under [the Semantic Versioning guidelines](http://semver.org/). Maybe I will screw it up occasionally, but I'll adhere to those rules whenever possible.

# License

MIT. See "[LICENSE.txt](LICENSE.txt)"

# See Also

- [MongoDB Blog: 'Schema Design for Time Series Data in MongoDB'](http://blog.mongodb.org/post/65517193370/schema-design-for-time-series-data-in-mongodb)
- [MongoDB presentaion: The Aggregation Framework](https://www.mongodb.com/presentations/aggregation-framework-0)
- [Expire Data from Collections by Setting TTL](https://docs.mongodb.org/manual/tutorial/expire-data/)



