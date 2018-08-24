/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var vm = require('../BaliEnvironment');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {

    describe('Test the analysis and compilation of an example type.', function() {

        it('should compile source documents into assembly instructions.', function() {
            var testFolder = 'test/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + prefix + '.bali';
                var type = fs.readFileSync(baliFile, 'utf8');
                expect(type).to.exist;  // jshint ignore:line
                var tree = vm.compileType(type);
                //var tree = vm.compileType(type, true);  // includes assembly instructions
                expect(type).to.exist;  // jshint ignore:line
                var formatted = vm.formatType(tree);
                //fs.writeFileSync(baliFile, formatted, 'utf8');
                expect(formatted).to.equal(type);
            }
        });

    });

});
