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

var Probability = require('../../elements/Probability').Probability;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(13);

        var empty = new Probability();
        var number = empty.toNumber();
        test.equal(number, 0, 'The probability should have been number 0.');
        var string = empty.toString();
        test.equal(string, 'false', "The probability should have been string 'false'.");
        test.ok(!empty.toBoolean(), "The probability should have been false.");

        var zero = new Probability(0);
        number = zero.toNumber();
        test.equal(number, 0, 'The probability should have been number 0.');
        string = zero.toString();
        test.equal(string, 'false', "The probability should have been string 'false'.");
        test.ok(!zero.toBoolean(), "The probability should have been false.");

        var half = new Probability(0.5);
        number = half.toNumber();
        test.equal(number, 0.5, 'The probability should have been number 0.5');
        string = half.toString();
        test.equal(string, '.5', "The probability should have been string '0.5'.");

        var one = new Probability(1);
        number = one.toNumber();
        test.equal(number, 1, 'The probability should have been number 1.');
        string = one.toString();
        test.equal(string, 'true', "The probability should have been string 'true'.");
        test.ok(one.toBoolean(), "The probability should have been true.");

        test.throws(
            function() {
                var negative = new Probability(-1);
            }
        );

        test.throws(
            function() {
                var two = new Probability(2);
            }
        );
        test.done();
/*  },  // uncomment this test as needed, but it runs slowly ;-)
    'Test Accuracy': function(test) {
        test.expect(1);
        var even = new Probability(0.5);
        var heads = 0;
        var tosses = 10000;
        for (var i = 1; i < tosses; i++) {
            if (even.toBoolean()) heads++;
        }
        test.ok(tosses * 0.485 < heads && heads < tosses * 0.515, 'The coin toss is not fair: ' + heads * 100 / tosses + '%');
        test.done();
*/  }
});
