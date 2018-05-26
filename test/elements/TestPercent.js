/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Percent = require('../../elements/Percent').Percent;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test percent constructors', function() {

        it('should construct a default percent of zero', function() {
            var empty = new Percent();
            var number = empty.toNumber();
            expect(number).to.equal(0);
            var string = empty.toString();
            expect(string).to.equal('0%');
        });

        it('should construct a percent of zero', function() {
            var zero = new Percent('0%');
            var number = zero.toNumber();
            expect(number).to.equal(0);
            var string = zero.toString();
            expect(string).to.equal('0%');
        });

        it('should construct a percent of 13.25%', function() {
            var decimal = new Percent(13.25);
            var number = decimal.toNumber();
            expect(number).to.equal(0.1325);
            var string = decimal.toString();
            expect(string).to.equal('13.25%');
        });

        it('should construct a percent of -7%', function() {
            var negative = new Percent(-7);
            var number = negative.toNumber();
            expect(number).to.equal(-0.07);
            var string = negative.toString();
            expect(string).to.equal('-7%');
        });

        it('should construct a percent of 50%', function() {
            var fifty = new Percent('50%');
            var number = fifty.toNumber();
            expect(number).to.equal(0.5);
            var string = fifty.toString();
            expect(string).to.equal('50%');
        });

        it('should construct a percent of -0.234%', function() {
            var fractional = new Percent('-0.234%');
            var number = fractional.toNumber();
            expect(number).to.equal(-0.00234);
            var string = fractional.toString();
            expect(string).to.equal('-0.234%');
        });

        it('should construct a percent of 100%', function() {
            var hundred = new Percent('100%');
            var number = hundred.toNumber();
            expect(number).to.equal(1);
            var string = hundred.toString();
            expect(string).to.equal('100%');
        });

        it('should construct a percent of 150%', function() {
            var hundred = new Percent('150%');
            var number = hundred.toNumber();
            expect(number).to.equal(1.5);
            var string = hundred.toString();
            expect(string).to.equal('150%');
        });

    });

});
