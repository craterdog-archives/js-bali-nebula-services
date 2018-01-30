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

var Symbol = require('../../elements/Symbol').Symbol;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(4);

        test.throws(
            function() {
                var empty = new Symbol();
            }
        );

        test.throws(
            function() {
                var bad = new Symbol('White Space');
            }
        );

        var symbol = new Symbol('$foobar');
        var string = symbol.toString();
        test.equal(string, '$foobar', "The symbol should have been '$foobar'.");
        var identifier = symbol.getIdentifier();
        test.equal(identifier, 'foobar', "The identifier should have been 'foobar'.");

        test.done();
    }
});
