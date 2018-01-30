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

var Tag = require('../../elements/Tag').Tag;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(6);

        var random = new Tag();
        test.equal(random.getNumberOfBytes(), 20, 'A default tag should have 20 bytes.');
        var expected = random.toString();
        var tag = new Tag(expected);
        var result = tag.toString();
        test.equal(result, expected, "1 The tag values didn't match.");

        random = new Tag(15);
        test.equal(random.getNumberOfBytes(), 15, "The number of bytes didn't match.");
        expected = random.toString();
        tag = new Tag(expected);
        result = tag.toString();
        test.equal(result, expected, "2 The tag values didn't match.");

        expected = '#NT5PG2BXZGBGV5JTNPCP2HTM4JP6CS4X';
        tag = new Tag(expected);
        result = tag.toString();
        test.equal(result, expected, "3 The tag values didn't match.");

        test.throws(
            function() {
                var bad = new Tag('This is not a tag!');
            }
        );
        test.done();
    }
});
