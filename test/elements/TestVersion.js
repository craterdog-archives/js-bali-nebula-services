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

var Version = require('../../elements/Version').Version;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(8);

        var empty = new Version();
        var string = empty.toString();
        test.equal(string, 'v1', "1 The version strings didn't match.");

        var major = new Version('v42');
        string = major.toString();
        test.equal(string, 'v42', "2 The version strings didn't match.");

        var minor = new Version('v41.6');
        string = minor.toString();
        test.equal(string, 'v41.6', "3 The version strings didn't match.");

        var bug = new Version('v2.13.5');
        string = bug.toString();
        test.equal(string, 'v2.13.5', "4 The version strings didn't match.");

        test.throws(
            function() {
                new Version('1');
            }
        );

        test.throws(
            function() {
                new Version('v1.');
            }
        );

        test.throws(
            function() {
                new Version('v1.0');
            }
        );

        test.throws(
            function() {
                new Version('v1.0.2');
            }
        );

        test.done();
    }
});
