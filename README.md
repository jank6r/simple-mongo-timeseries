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

## Introduction

Todo

# Versioning

All versions are `<major>.<minor>.<patch>` which will be incremented for
breaking backward compat and major reworks, new features without breaking
change, and bug fixes, respectively.

# License

MIT. See "[LICENSE.txt](LICENSE.txt)"

# See Also

- [MongoDB Blog: 'Schema Design for Time Series Data in MongoDB'](http://blog.mongodb.org/post/65517193370/schema-design-for-time-series-data-in-mongodb)
- [MongoDB presentaion: The Aggregation Framework](https://www.mongodb.com/presentations/aggregation-framework-0)



