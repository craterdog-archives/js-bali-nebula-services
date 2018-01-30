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

var Duration = require('../../elements/Duration').Duration;
var testCase = require('nodeunit').testCase;

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

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(tests.length + 2);

        var duration = new Duration();
        var string = duration.toString();
        test.equal(string, tests[0], 'The default duration should have been zero seconds: ' + string);

        duration = new Duration('~P5W');
        string = duration.toString();
        test.equal(string, '~P35D', 'The weeks duration should have been translated to days: ' + string);

        for (var i = 0; i < tests.length; i++) {
            var expected = tests[i];
            duration = new Duration(expected);
            string = duration.toString();
            test.equal(string, expected, "" + (i + 1) + " The durations didn't match.");
        }

        test.done();
    }
});
