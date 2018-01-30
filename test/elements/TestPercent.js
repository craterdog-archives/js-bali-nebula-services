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

var Percent = require('../../elements/Percent').Percent;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(14);

        var empty = new Percent();
        var number = empty.toNumber();
        test.equal(number, 0, 'The percent should have been number 0.');
        var string = empty.toString();
        test.equal(string, '0%', "The percent should have been string '0%'.");

        var zero = new Percent('0%');
        number = zero.toNumber();
        test.equal(number, 0, 'The percent should have been number 0.');
        string = zero.toString();
        test.equal(string, '0%', "The percent should have been string '0%'.");

        var decimal = new Percent(13.25);
        number = decimal.toNumber();
        test.equal(number, 0.1325, 'The percent should have been number 0.1325');
        string = decimal.toString();
        test.equal(string, '13.25%', "The percent should have been string '13.25%'.");

        var negative = new Percent(-7);
        number = negative.toNumber();
        test.equal(number, -0.07, 'The percent should have been number -0.07');
        string = negative.toString();
        test.equal(string, '-7%', "The percent should have been string '-7%'.");

        var fifty = new Percent('50%');
        number = fifty.toNumber();
        test.equal(number, 0.5, 'The percent should have been number 0.5');
        string = fifty.toString();
        test.equal(string, '50%', "The percent should have been string '50%'.");

        var fractional = new Percent('-0.234%');
        number = fractional.toNumber();
        test.equal(number, -0.00234, 'The percent should have been number -0.00234');
        string = fractional.toString();
        test.equal(string, '-0.234%', "The percent should have been string '-0.234%'.");

        var hundred = new Percent('100%');
        number = hundred.toNumber();
        test.equal(number, 1, 'The percent should have been number 1.');
        string = hundred.toString();
        test.equal(string, '100%', "The percent should have been string '100%'.");

        test.done();
    }
});
