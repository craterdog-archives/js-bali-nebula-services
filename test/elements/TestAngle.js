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

var Angle = require('../../elements/Angle').Angle;
var testCase = require('nodeunit').testCase;
/* global NaN, Infinity */


module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(12);

        test.strictEqual(new Angle().toNumber(), Angle.ZERO.toNumber(), "1 The angle should have been Angle.ZERO.");
        test.strictEqual(new Angle(0).toNumber(), Angle.ZERO.toNumber(), "2 The angle should have been Angle.ZERO.");
        test.strictEqual(new Angle(-0).toNumber(), Angle.ZERO.toNumber(), "3 The angle should have been Angle.ZERO.");
        test.strictEqual(new Angle('pi').toNumber(), Angle.PI.toNumber(), "4 The angle should have been Angle.PI.");
        test.strictEqual(new Angle('-pi').toNumber(), Angle.PI.toNumber(), "5 The angle should have been Angle.PI.");
        test.strictEqual(new Angle(Math.PI).toNumber(), Angle.PI.toNumber(), "6 The angle should have been Angle.PI.");
        test.strictEqual(new Angle(-Math.PI).toNumber(), Angle.PI.toNumber(), "7 The angle should have been Angle.PI.");
        test.strictEqual(new Angle(2 * Math.PI).toNumber(), Angle.ZERO.toNumber(), "8 The angle should have been Angle.ZERO.");
        test.strictEqual(new Angle(Math.PI / 2).toNumber(), Math.PI / 2, "9 The angle should have been Math.PI / 2.");

        test.throws(
            function() {
                new Angle(NaN);
            }
        );

        test.throws(
            function() {
                new Angle(Infinity);
            }
        );

        test.throws(
            function() {
                new Angle(-Infinity);
            }
        );
        test.done();
    },
    'Test Functions': function(test) {
        var testValues = [Angle.ZERO, Angle.PI, new Angle(-Math.PI), new Angle(Math.PI / 2), new Angle(-Math.PI / 2), new Angle(-Math.PI / 3)];
        var tests = testValues.length;
        test.expect(tests);
        for (var i = 0; i < tests; i++) {
            var angle = testValues[i];
            var sine = Angle.sine(angle);
            var cosine = Angle.cosine(angle);
            var arctangent = Angle.arctangent(sine, cosine);
            test.strictEqual(arctangent.toNumber(), angle.toNumber(), "The arctangent of sine/cosine should equal the angle.");
        }

        test.done();
    }
});
