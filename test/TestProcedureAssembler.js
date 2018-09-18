/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var BaliProcedure = require('bali-instruction-set/BaliProcedure');
var assembler = require('../compiler/ProcedureAssembler');
var utilities = require('../utilities/BytecodeUtilities');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {

    describe('Test the assember.', function() {

        it('should assemble procedures', function() {
            var testFolder = 'test/compiler/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.basm')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var basmFile = testFolder + prefix + '.basm';
                var codeFile = testFolder + prefix + '.code';
                var instructions = fs.readFileSync(basmFile, 'utf8');
                expect(instructions).to.exist;  // jshint ignore:line
            }
        });

    });

});
