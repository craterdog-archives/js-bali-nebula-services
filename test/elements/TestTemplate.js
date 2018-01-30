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

var Template = require('../../elements/Template').Template;
var testCase = require('nodeunit').testCase;
/* global NaN, Infinity */


module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(4);

        test.strictEqual(new Template().toString(), Template.NONE.toString(), "1 The template value should have been Template.NONE.");
        test.strictEqual(new Template('none').toString(), Template.NONE.toString(), "2 The template value should have been Template.NONE.");
        test.strictEqual(new Template('any').toString(), Template.ANY.toString(), "3 The template value should have been Template.ANY.");

        test.throws(
            function() {
                new Template('foobar');
            }
        );

        test.done();
    }
});
