/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Template = require('../../elements/Template').Template;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test template constructors', function() {

        it('should generate a default none template', function() {
            expect(new Template().toString()).to.equal(Template.NONE.toString());
        });

        it('should generate an explicit none template', function() {
            expect(new Template('none').toString()).to.equal(Template.NONE.toString());
        });

        it('should generate an explicit any template', function() {
            expect(new Template('any').toString()).to.equal(Template.ANY.toString());
        });

        it('should throw an exception for an invalid template', function() {
            expect(
                function() {
                    new Template('foobar');
                }
            ).to.throw();
        });

    });

});
