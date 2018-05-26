/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Binary = require('../../elements/Binary').Binary;
var random = require('../../utilities/RandomUtilities');
var codex = require('../../utilities/EncodingUtilities');
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test binary constructors', function() {

        it('should construct random binary values with default encoding of base 64', function() {
            var expected = random.generateRandomBytes(2000);
            var binary = new Binary(expected);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(64);
        });

        it('should construct a binary value with detected encoding of base 64', function() {
            var expected = "'0123456789abcdefghijklmnopqrstuvwxyz'";
            var binary = new Binary(expected, 'autodetect');
            expect(binary.toBase64()).to.equal(expected);
            expect(binary.base).to.equal(64);
        });

        it('should construct a binary value with specific base encodings', function() {
            var bases = [2, 16, 32, 64];
            for (var i = 0; i < bases.length; i++) {
                var base = bases[i];
                var expected = "'" + codex['base' + base + 'Encode'](random.generateRandomBytes(base + i), '') + "'";
                var binary = new Binary(expected, base);
                var result = binary['toBase' + base]();
                expect(result).to.equal(expected);
                expect(binary.base).to.equal(base);
            }
        });

        it('should construct a binary value with specific base encodings', function() {
            expect(
                function() {
                    var bad = new Binary("''", 25);
                }
            ).to.throw();
        });

    });

});
