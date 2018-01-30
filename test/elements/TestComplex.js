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
var Complex = require('../../elements/Complex').Complex;
var testCase = require('nodeunit').testCase;
/* global NaN, Infinity */


module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(8);

        test.strictEqual(new Complex().toString(), Complex.ZERO.toString(), "1 The complex should have been Complex.ZERO.");
        test.strictEqual(new Complex(NaN).toString(), Complex.UNDEFINED.toString(), "2 The complex should have been Complex.UNDEFINED.");
        test.strictEqual(new Complex(0).toNumber(), Complex.ZERO.toNumber(), "3 The complex should have been Complex.ZERO.");
        test.strictEqual(new Complex(-0).toNumber(), Complex.ZERO.toNumber(), "4 The complex should have been Complex.ZERO.");
        test.strictEqual(new Complex(5).toNumber(), 5, "5 The complex should have been 5.");
        test.strictEqual(new Complex(-5).toNumber(), -5, "6 The complex should have been -5.");
        test.strictEqual(new Complex(Infinity).toNumber(), Complex.INFINITY.toNumber(), "7 The complex should have been Complex.INFINITY.");
        test.strictEqual(new Complex(-Infinity).toNumber(), Complex.INFINITY.toNumber(), "8 The complex should have been Complex.INFINITY.");

        test.done();
    },
    'Test Methods': function(test) {
        var testValues = [
            Complex.UNDEFINED,
            Complex.ZERO,
            Complex.INFINITY,
            new Complex(),
            new Complex(-5),
            new Complex(5),
            new Complex(-3, 4),
            new Complex(-1, 1),
            new Complex(1, new Angle(1)),
            new Complex(5, Angle.PI),
            new Complex('1'),
            new Complex('-1'),
            new Complex('i'),
            new Complex('-i'),
            new Complex('(1.23E-56, -7.8E90i)'),
            new Complex('(5 e^3.141592653589793i)')
        ];
        var isUndefinedValues = [
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];
        var isZeroValues = [
            false,
            true,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];
        var isInfiniteValues = [
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];
        var realValues = [
            NaN,
            0,
            Infinity,
            0,
            -5,
            5,
            -3,
            -1,
            0.5403023058681398,
            -5,
            1,
            -1,
            0,
            0,
            1.23E-56,
            -5
        ];
        var imaginaryValues = [
            NaN,
            0,
            Infinity,
            0,
            0,
            0,
            4,
            1,
            0.8414709848078965,
            0,
            0,
            0,
            1,
            -1,
            -7.8E90,
            0
        ];
        var magnitudeValues = [
            NaN,
            0,
            Infinity,
            0,
            5,
            5,
            5,
            1.4142135623730951,
            1,
            5,
            1,
            1,
            1,
            1,
            7.8E90,
            5
        ];
        var angleValues = [
            0,
            0,
            0,
            0,
            3.141592653589793,
            0,
            2.214297435588181,
            2.356194490192345,
            1,
            3.141592653589793,
            0,
            3.141592653589793,
            1.5707963267948966,
            -1.5707963267948966,
            -1.5707963267948966,
            3.141592653589793
        ];
        var stringValues = [
            'undefined',
            '0',
            'infinity',
            '0',
            '-5',
            '5',
            '(-3, 4i)',
            '(-1, i)',
            '(1 e^i)',
            '(5 e^pi i)',
            '1',
            '-1',
            'i',
            '-i',
            '(1.23E-56, -7.8E90i)',
            '(5 e^pi i)'
        ];
        var rectangularValues = [
            'undefined',
            '0',
            'infinity',
            '0',
            '-5',
            '5',
            '(-3, 4i)',
            '(-1, i)',
            '(0.5403023058681398, 0.8414709848078965i)',
            '-5',
            '1',
            '-1',
            'i',
            '-i',
            '(1.23E-56, -7.8E90i)',
            '-5'
        ];
        var polarValues = [
            'undefined',
            '0',
            'infinity',
            '0',
            '(5 e^pi i)',
            '5',
            '(5 e^2.214297435588181i)',
            '(1.4142135623730951 e^2.356194490192345i)',
            '(1 e^i)',
            '(5 e^pi i)',
            '1',
            '(1 e^pi i)',
            '(1 e^1.5707963267948966i)',
            '(1 e^-1.5707963267948966i)',
            '(7.8E90 e^-1.5707963267948966i)',
            '(5 e^pi i)'
        ];
        var tests = testValues.length;
        test.expect(10 * tests);
        for (var i = 0; i < tests; i++) {
            var complex = testValues[i];
            test.strictEqual(complex.isUndefined(), isUndefinedValues[i]);
            test.strictEqual(complex.isZero(), isZeroValues[i]);
            test.strictEqual(complex.isInfinite(), isInfiniteValues[i]);
            test.strictEqual(complex.getRealPart().toString(), realValues[i].toString());
            test.strictEqual(complex.getImaginaryPart().toString(), imaginaryValues[i].toString());
            test.strictEqual(complex.getMagnitude().toString(), magnitudeValues[i].toString());
            test.strictEqual(complex.getAngle().toNumber(), angleValues[i]);
            test.strictEqual(complex.toString(), stringValues[i]);
            test.strictEqual(complex.toRectangular(), rectangularValues[i]);
            test.strictEqual(complex.toPolar(), polarValues[i]);
        }

        test.done();
    }
});
