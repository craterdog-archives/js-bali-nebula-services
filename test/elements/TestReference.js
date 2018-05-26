/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Reference = require('../../elements/Reference').Reference;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test reference constructors', function() {

        it('should throw an exception for an empty reference', function() {
            expect(
                function() {
                    var empty = new Reference();
                }
            ).to.throw();
            expect(
                function() {
                    var empty = new Reference('');
                }
            ).to.throw();
            expect(
                function() {
                    var empty = new Reference('<>');
                }
            ).to.throw();
        });

        it('should construct references and format matching references', function() {
            for (var i = 0; i < tests.length; i++) {
                var expected = tests[i];
                var reference = new Reference(expected);
                var string = reference.toString();
                expect(string).to.equal(expected);
            }
        });

    });

});

var tests = [
    '<https://google.com/>',
    '<bali:/#RKVVW90GXFP44PBTLFLF8ZG8NR425JYM>',
    '<bali:/#RKVVW90GXFP44PBTLFLF8ZG8NR425JYMv3.1>',
    '<bali:/bali/elements/Text>',
    '<bali:/bali/elements/Text?version=6.12.1>',
    '<bali:/abcCorp/reports/2010/Q3>'
];
