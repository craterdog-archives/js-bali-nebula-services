/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var codex = require('../../utilities/EncodingUtilities');
var random = require('../../utilities/RandomUtilities');
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test encoding utilities with round-trip conversions', function() {

        it('should convert integers to bytes and back again', function() {
            for (var i = 0; i < 100; i++) {
                var bytes = random.generateRandomBytes(4);
                var expected = codex.bytesToInteger(bytes);
                bytes = codex.integerToBytes(expected);
                var integer = codex.bytesToInteger(bytes);
                expect(integer).to.equal(expected);
            }
        });

        it('should convert bytes to integers and back again', function() {
            for (var i = 0; i < 256; ) {
                var expected = '';
                for (var b = 0; b < 4; b++) {
                    expected += String.fromCharCode(i++);
                }
                var integer = codex.bytesToInteger(expected);
                var bytes = codex.integerToBytes(integer);
                expect(bytes).to.equal(expected);
            }
        });

        it('should convert bytes to base 2 and back again', function() {
            for (var i = 0; i < 21; i++) {
                var bytes = random.generateRandomBytes(i);
                var base2 = codex.base2Encode(bytes, '    ');
                var decoded = codex.base2Decode(base2);
                expect(decoded).to.equal(bytes);
            }
        });

        it('should convert bytes to base 16 and back again', function() {
            for (var i = 0; i < 81; i++) {
                var bytes = random.generateRandomBytes(i);
                var base16 = codex.base16Encode(bytes, '    ');
                var decoded = codex.base16Decode(base16);
                expect(decoded).to.equal(bytes);
            }
        });

        it('should convert bytes to base 32 and back again', function() {
            for (var i = 0; i < 101; i++) {
                var bytes = random.generateRandomBytes(i);
                var base32 = codex.base32Encode(bytes, '    ');
                var decoded = codex.base32Decode(base32);
                expect(decoded).to.equal(bytes);
            }
        });

        it('should convert bytes to base 64 and back again', function() {
            for (var i = 0; i < 121; i++) {
                var bytes = random.generateRandomBytes(i);
                var base64 = codex.base64Encode(bytes, '    ');
                var decoded = codex.base64Decode(base64);
                expect(decoded).to.equal(bytes);
            }
        });

    });

});
