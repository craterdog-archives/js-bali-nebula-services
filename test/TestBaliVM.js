/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var vm = require('../BaliVM');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test the compiler and assembler', function() {

        it('should compile source documents into assembly instructions.', function() {
            var testFolder = 'test/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + prefix + '.bali';
                // strip off the POSIX newline terminator so that the round-trip comparison will work
                var type = fs.readFileSync(baliFile, 'utf8').slice(0, -1);
                expect(type).to.exist;  // jshint ignore:line
                var tree = vm.compileType(type);
                expect(type).to.exist;  // jshint ignore:line
                var formatted = vm.formatType(tree);
                //fs.writeFileSync(baliFile, formatted + '\n', 'utf8');  // add POSIX terminator
                // strip off the POSIX newline terminator so that the round-trip comparison will work
                var expected = fs.readFileSync(baliFile, 'utf8').slice(0, -1);
                expect(expected).to.exist;  // jshint ignore:line
                expect(formatted).to.equal(expected);
            }
        });

    });

});
