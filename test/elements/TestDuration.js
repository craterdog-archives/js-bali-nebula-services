/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Duration = require('../../elements/Duration').Duration;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Cloud Environment™', function() {

    describe('Test duration constructors', function() {

        it('should construct a default duration of zero', function() {
            var duration = new Duration();
            var string = duration.toString();
            expect(string).to.equal(tests[0]);
        });

        it('should construct a duration of days from weeks', function() {
            var duration = new Duration('~P5W');
            var string = duration.toString();
            expect(string).to.equal('~P35D');
        });

        it('should construct a duration and format it the same', function() {
            for (var i = 0; i < tests.length; i++) {
                var expected = tests[i];
                var duration = new Duration(expected);
                var string = duration.toString();
                expect(string).to.equal(expected);
            }
        });

    });

});

var tests = [
    '~P0D',
    '~P12345Y',
    '~P2Y3M7D',
    '~P2Y3M7DT8H',
    '~P2Y3M7DT8H29M',
    '~P2Y3M7DT8H29M54S',
    '~P3M7DT8H29M54.321S',
    '~P7DT8H29M54.321S',
    '~PT8H29M54.321S',
    '~PT29M54.321S',
    '~PT54.321S',
    '~PT54S'
];

