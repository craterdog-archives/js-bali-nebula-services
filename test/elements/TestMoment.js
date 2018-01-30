/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

var Moment = require('../../elements/Moment').Moment;
var testCase = require('nodeunit').testCase;

var tests = [
    '<2017-12-30T17:38:35.726>',
    '<2017-12-30T17:38:35>',
    '<2017-12-30T17:38>',
    '<2017-12-30T17>',
    '<2017-12-30>',
    '<2017-12>',
    '<2017>',
    '<-10000>'
];

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(tests.length + 1);

        var time = new Moment();
        var string = time.toString();
        test.equal(string.length, 25, 'The time should have been 25 characters long: ' + string);

        for (var i = 0; i < tests.length; i++) {
            var expected = tests[i];
            time = new Moment(expected);
            string = time.toString();
            test.equal(string, expected, "" + (i + 1) + " The times didn't match.");
        }

        test.done();
    }
});
