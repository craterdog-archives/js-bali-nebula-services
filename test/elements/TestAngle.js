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
var mocha = require('mocha');
var expect = require('chai').expect;
/* global NaN, Infinity */

describe('Bali Cloud Environment™', function() {

    describe('Test angle constructors', function() {

        it('should construct and equal zero', function() {
            expect(new Angle().toNumber()).to.equal(Angle.ZERO.toNumber());
            expect(new Angle(0).toNumber()).to.equal(Angle.ZERO.toNumber());
            expect(new Angle(-0).toNumber()).to.equal(Angle.ZERO.toNumber());
            expect(new Angle(2 * Math.PI).toNumber()).to.equal(Angle.ZERO.toNumber());
        });

        it('should construct and equal pi', function() {
            expect(new Angle('pi').toNumber()).to.equal(Angle.PI.toNumber());
            expect(new Angle('-pi').toNumber()).to.equal(Angle.PI.toNumber());
            expect(new Angle(Math.PI).toNumber()).to.equal(Angle.PI.toNumber());
            expect(new Angle(-Math.PI).toNumber()).to.equal(Angle.PI.toNumber());
        });

        it('should construct and equal pi/2', function() {
            expect(new Angle(Math.PI / 2).toNumber()).to.equal(Math.PI / 2);
        });

        it('should throw an exception', function() {
            expect(
                function() {
                    new Angle(NaN);
                }
            ).to.throw();
            expect(
                function() {
                    new Angle(Infinity);
                }
            ).to.throw();
            expect(
                function() {
                    new Angle(-Infinity);
                }
            ).to.throw();
        });

    });

    describe('Test angle functions', function() {

        it('should run round-trip angle functions', function() {
            var testValues = [
                Angle.ZERO,
                Angle.PI,
                new Angle(-Math.PI),
                new Angle(Math.PI / 2),
                new Angle(-Math.PI / 2),
                new Angle(-Math.PI / 3)
            ];
            var tests = testValues.length;
            for (var i = 0; i < tests; i++) {
                var angle = testValues[i];
                var sine = Angle.sine(angle);
                var cosine = Angle.cosine(angle);
                var arctangent = Angle.arctangent(sine, cosine);
                expect(arctangent.toNumber()).to.equal(angle.toNumber());
            }
        });

    });

});
