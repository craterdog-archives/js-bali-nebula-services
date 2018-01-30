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

var Reference = require('../../elements/Reference').Reference;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(7);

        test.throws(
            function() {
                var empty = new Reference();
            }
        );

        var tests = [
            '<https://google.com/>',
            '<bali:/#RKVVW90GXFP44PBTLFLF8ZG8NR425JYM>',
            '<bali:/#RKVVW90GXFP44PBTLFLF8ZG8NR425JYMv3.1>',
            '<bali:/bali/elements/Text>',
            '<bali:/bali/elements/Text?version=6.12.1>',
            '<bali:/abcCorp/reports/2010/Q3>'
        ];
        for (var i = 0; i < tests.length; i++) {
            var expected = tests[i];
            var reference = new Reference(expected);
            var string = reference.toString();
            test.equal(string, expected, "" + (i + 1) + " The references didn't match.");
        }

        test.done();
    }
});
