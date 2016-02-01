describe('timeseries keys suite', function () {

    var mongoTSKeys = require('../lib/mongoTSKeys.js');
    var keyBuilderFactory;

    beforeEach(function () {
        keyBuilderFactory = mongoTSKeys.KeyBuilderFactory();
    });

    describe('Invalid sensor names', function () {

        var date = new Date('2015-11-25T18:32:21.196');

        it('should throw error', function () {
            var sensor = 'testXYZ:';
            expect(function () {
                keyBuilderFactory.fromNameAndDate(sensor, date);
            }).toThrow();
        });

        it('should throw error', function () {
            var sensor = 'test&123';
            expect(function () {
                keyBuilderFactory.fromNameAndDate(sensor, date);
            }).toThrow();
        });

        it('should throw error', function () {
            var sensor = 'test(123';
            expect(function () {
                keyBuilderFactory.fromNameAndDate(sensor, date);
            }).toThrow();
        });

        it('should throw error', function () {
            var sensor = '';
            expect(function () {
                keyBuilderFactory.fromNameAndDate(sensor, date);
            }).toThrow();
        });
    });

    describe('check output when constructed from sensor name and date ', function () {
        var sensor = 'testXYZ';
        var date = new Date('2015-11-25T18:32:21.196');
        var keyBuilder;

        beforeEach(function () {
            keyBuilder = keyBuilderFactory.fromNameAndDate(sensor, date);
        });

        it('generates correct sensor name', function () {
            expect(keyBuilder.getSensor()).toBe(sensor);
        });

        it('generates correct date', function () {
            expect(keyBuilder.getPeriod()).toEqual(date);
        });

        it('generates correct hour of day', function () {
            expect(keyBuilder.getHour()).toEqual('19');
        });

        it('generates correct key string for samples', function () {
            expect(keyBuilder.buildReadingString()).toEqual('testXYZ:R:1511251932');
        });

        it('generates correct key string for aggregated data', function () {
            expect(keyBuilder.buildAggregationString()).toEqual('testXYZ:A:151125');
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegex()).toEqual(/^testXYZ:R:15112519/);
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegexAllReadings()).toEqual(/^testXYZ:R:/);
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegexAllAggregations()).toEqual(/^testXYZ:A:/);
        });
    });

    describe('check output when constructed from key string', function () {
        var keyBuilder;

        beforeEach(function () {
            keyBuilder = keyBuilderFactory.fromKeyString('testABCD:R:1511241709');
        });

        it('generates correct sensor name', function () {
            expect(keyBuilder.getSensor()).toBe('testABCD');
        });

        it('generates correct date', function () {
            expect(keyBuilder.getPeriod()).toEqual(new Date('2015-11-24T16:09:00.000'));
        });

        it('generates correct hour of day', function () {
            expect(keyBuilder.getHour()).toEqual('17');
        });

        it('generates correct key string for samples', function () {
            expect(keyBuilder.buildReadingString()).toEqual('testABCD:R:1511241709');
        });

        it('generates correct key string for aggregated data', function () {
            expect(keyBuilder.buildAggregationString()).toEqual('testABCD:A:151124');
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegex()).toEqual(/^testABCD:R:15112417/);
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegexAllReadings()).toEqual(/^testABCD:R:/);
        });

        it('generates correct regex search string', function () {
            expect(keyBuilder.buildRegexAllAggregations()).toEqual(/^testABCD:A:/);
        });
    });

    describe('check output when constructed from other builder', function () {

        it('generates correct output when constructed from other builder', function () {

            var otherKeyBuilder = keyBuilderFactory.fromKeyString('testABCD:R:1511272145');
            expect(otherKeyBuilder.getSensor()).toBe('testABCD');
            expect(otherKeyBuilder.getPeriod()).toEqual(new Date('2015-11-27T20:45:00.000'));
            expect(otherKeyBuilder.getHour()).toEqual('21');

            var keyBuilder = keyBuilderFactory.increaseHour(otherKeyBuilder);

            expect(keyBuilder.getSensor()).toBe('testABCD');
            expect(keyBuilder.getPeriod()).toEqual(new Date('2015-11-27T21:45:00.000'));
            expect(keyBuilder.getHour()).toEqual('22');
        });
    });


});
