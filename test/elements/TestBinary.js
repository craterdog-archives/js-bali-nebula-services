/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var codex = require('bali-utilities/EncodingUtilities');
var random = require('bali-utilities/RandomUtilities');
var Binary = require('../../elements/Binary').Binary;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test binary constructors', function() {

        it('should construct binary values by detecting the base', function() {
            var expected = '';
            for (var i = 0; i < 256; i++) {
                expected += String.fromCharCode(i);
            }
            var base32 = "'" + codex.base32Encode(expected) + "'";
            var binary = new Binary(base32);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(32);
        });

        it('should construct binary values with encoding of base 64', function() {
            var expected = '';
            for (var i = 0; i < 256; i++) {
                expected += String.fromCharCode(i);
            }
            var base64 = "'" + codex.base64Encode(expected) + "'";
            var binary = new Binary(base64, 64);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(64);
        });

        it('should construct binary values with encoding of base 32', function() {
            var expected = '';
            for (var i = 0; i < 256; i++) {
                expected += String.fromCharCode(i);
            }
            var base32 = "'" + codex.base32Encode(expected) + "'";
            var binary = new Binary(base32, 32);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(32);
        });

        it('should construct binary values with encoding of base 16', function() {
            var expected = '';
            for (var i = 0; i < 256; i++) {
                expected += String.fromCharCode(i);
            }
            var base16 = "'" + codex.base16Encode(expected) + "'";
            var binary = new Binary(base16, 16);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(16);
        });

        it('should construct binary values with encoding of base 2', function() {
            var expected = '';
            for (var i = 0; i < 256; i++) {
                expected += String.fromCharCode(i);
            }
            var base2 = "'" + codex.base2Encode(expected) + "'";
            var binary = new Binary(base2, 2);
            expect(binary.getRawBytes()).to.equal(expected);
            expect(binary.base).to.equal(2);
        });

        it('should throw and exception when constructing a binary value with an illegal base', function() {
            expect(
                function() {
                    var bad = new Binary("''", 25);
                }
            ).to.throw();
        });

    });

});
