/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Probability = require('../../elements/Probability').Probability;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test probability constructors', function() {

        it('should construct a default probability of zero', function() {
            var empty = new Probability();
            var number = empty.toNumber();
            expect(number).to.equal(0);
            var string = empty.toString();
            expect(string).to.equal('false');
            expect(empty.toBoolean()).to.be.false;  // jshint ignore:line
        });

        it('should construct a probability of zero', function() {
            var zero = new Probability(0);
            var number = zero.toNumber();
            expect(number).to.equal(0);
            var string = zero.toString();
            expect(string).to.equal('false');
            expect(zero.toBoolean()).to.be.false;  // jshint ignore:line
        });

        it('should construct a probability of one half', function() {
            var half = new Probability(0.5);
            var number = half.toNumber();
            expect(number).to.equal(0.5);
            var string = half.toString();
            expect(string).to.equal('.5');
        });

        it('should construct a probability of one', function() {
            var one = new Probability(1);
            var number = one.toNumber();
            expect(number).to.equal(1);
            var string = one.toString();
            expect(string).to.equal('true');
            expect(one.toBoolean()).to.be.true;  // jshint ignore:line
        });

        it('should throw an exception for negative probabilities', function() {
            expect(
                function() {
                    var negative = new Probability(-1);
                }
            ).to.throw();
        });

        it('should throw an exception for probabilities greater than 1', function() {
            expect(
                function() {
                    var two = new Probability(2);
                }
            ).to.throw();
        });

/*      // uncomment this test as needed, but it runs slowly ;-)
        it('should average very near 50% for many coin flips', function() {
            var even = new Probability(0.5);
            var heads = 0;
            var tosses = 10000;
            for (var i = 1; i < tosses; i++) {
                if (even.toBoolean()) heads++;
            }
            expect(tosses * 0.485 < heads && heads < tosses * 0.515).to.be.true;  // jshint ignore:line
        );
*/

    });

});
