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

var Binary = require('../../elements/Binary').Binary;
var random = require('../../utilities/RandomUtilities');
var codex = require('../../utilities/EncodingUtilities');
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(13);

        test.throws(
            function() {
                var bad = new Binary("''", 25);
            }
        );

        var expected = random.generateRandomBytes(2000);
        var binary = new Binary(expected);
        test.equal(binary.getRawBytes(), expected, "The raw byte strings don't match.");
        test.equal(binary.base, 64, "The default encoding base is incorrect.");

        expected = "'0123456789abcdefghijklmnopqrstuvwxyz'";
        binary = new Binary(expected, 'autodetect');
        test.equal(binary.toBase64(), expected, "1 The encoded binary strings don't match.");
        test.equal(binary.base, 64, "1 The encoding bases don't match.");

        var bases = [2, 16, 32, 64];
        for (var i = 0; i < bases.length; i++) {
            var base = bases[i];
            expected = "'" + codex['base' + base + 'Encode'](random.generateRandomBytes(base + i), '') + "'";
            binary = new Binary(expected, base);
            var result = binary['toBase' + base]();
            test.equal(result, expected, '' + (i + 2) + " The encoded binary strings don't match.");
            test.equal(binary.base, base, '' + (i + 2) + " The encoding bases don't match.");
        }

        test.done();
    }
});
