/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Angle = require('../../elements/Angle').Angle;
var Complex = require('../../elements/Complex').Complex;
var mocha = require('mocha');
var expect = require('chai').expect;
/* global NaN, Infinity */

describe('Bali Virtual Machine™', function() {

    describe('Test complex constructors', function() {

        it('should construct and equal zero', function() {
            expect(new Complex().toString()).to.equal(Complex.ZERO.toString());
            expect(new Complex('0').toNumber()).to.equal(Complex.ZERO.toNumber());
        });

        it('should construct and equal five', function() {
            expect(new Complex('5').toNumber()).to.equal(5);
            expect(new Complex('-5').toNumber()).to.equal(-5);
        });

        it('should construct and equal infinity', function() {
            expect(new Complex('infinity').toNumber()).to.equal(Complex.INFINITY.toNumber());
        });

        it('should construct and equal undefined', function() {
            expect(new Complex('undefined').toString()).to.equal(Complex.UNDEFINED.toString());
        });

    });

    describe('Test complex methods', function() {

        it('should generate method results that match the expected values', function() {
            var tests = testValues.length;
            for (var i = 0; i < tests; i++) {
                var complex = testValues[i];
                expect(complex.isUndefined()).to.equal(isUndefinedValues[i]);
                expect(complex.isZero()).to.equal(isZeroValues[i]);
                expect(complex.isInfinite()).to.equal(isInfiniteValues[i]);
                expect(complex.getRealPart().toString()).to.equal(realValues[i].toString());
                expect(complex.getImaginaryPart().toString()).to.equal(imaginaryValues[i].toString());
                expect(complex.getMagnitude().toString()).to.equal(magnitudeValues[i].toString());
                expect(complex.getAngle().toNumber()).to.equal(angleValues[i]);
                expect(complex.toString()).to.equal(stringValues[i]);
                expect(complex.toRectangular()).to.equal(rectangularValues[i]);
                expect(complex.toPolar()).to.equal(polarValues[i]);
            }
        });

    });

});

var testValues = [
    Complex.UNDEFINED,
    Complex.ZERO,
    Complex.INFINITY,
    new Complex(),
    new Complex('-5'),
    new Complex('5'),
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
    false
];
var realValues = [
    NaN,
    0,
    Infinity,
    0,
    -5,
    5,
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
    '1',
    '(1 e^pi i)',
    '(1 e^1.5707963267948966i)',
    '(1 e^-1.5707963267948966i)',
    '(7.8E90 e^-1.5707963267948966i)',
    '(5 e^pi i)'
];
