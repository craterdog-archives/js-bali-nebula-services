/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var Text = require('../../elements/Text').Text;
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test text constructors', function() {

        it('should generate a default empty text string', function() {
            var text = new Text();
            var string = text.toString();
            expect(string).to.equal('""');
            var raw = text.getRawString();
            expect(raw).to.equal('');
        });

        it('should generate an explicit empty text string', function() {
            var text = new Text('""');
            var string = text.toString();
            expect(string).to.equal('""');
            var raw = text.getRawString();
            expect(raw).to.equal('');
        });

        it('should generate a specific text string', function() {
            var text = new Text('"This is a text string."');
            var string = text.toString();
            expect(string).to.equal('"This is a text string."');
            var raw = text.getRawString();
            expect(raw).to.equal('This is a text string.');
        });

        it('should generate a specific text bloc containing quotes', function() {
            var text = new Text('"\nThis is a \"text block\" containing \'quotes\'.\n"');
            var string = text.toString();
            expect(string).to.equal('"\nThis is a \"text block\" containing \'quotes\'.\n"');
            var raw = text.getRawString();
            expect(raw).to.equal('\nThis is a \"text block\" containing \'quotes\'.\n');
        });

    });

});
