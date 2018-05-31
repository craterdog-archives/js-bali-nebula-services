/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var parser = require('bali-language/BaliLanguage');
var analyzer = require('../..//compiler/Analyzer');
var compiler = require('../..//compiler/Compiler');
var scanner = require('../..//assembler/Scanner');
var assembler = require('../..//assembler/Assembler');
var utilities = require('../../utilities/BytecodeUtilities');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test compiler and assembler', function() {

        it('should compile source documents into assembly instructions.', function() {
            var testFolder = 'test/example/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                //console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + prefix + '.bali';
                var source = fs.readFileSync(baliFile, 'utf8');
                expect(source).to.exist;  // jshint ignore:line
                var type = parser.parseDocument(source);
                expect(type).to.exist;  // jshint ignore:line
                var context = analyzer.analyzeType(type);
                expect(context).to.exist;  // jshint ignore:line
                var procedures = analyzer.extractProcedures(type);
                var names = Object.keys(procedures);
                for (var j = 0; j < names.length; j++) {
                    var name = names[j];
                    var procedure = procedures[name];

                    var instructions = compiler.compileProcedure(procedure, context);
                    expect(instructions).to.exist;  // jshint ignore:line
                    var basmFile = testFolder + name + '.basm';
                    //fs.writeFileSync(basmFile, instructions, 'utf8');
                    var expected = fs.readFileSync(basmFile, 'utf8');
                    expect(expected).to.exist;  // jshint ignore:line
                    expect(instructions).to.equal(expected);

                    var symbols = scanner.extractSymbols(procedure);
                    var bytecode = assembler.assembleBytecode(procedure, symbols);
                    var formatted = utilities.bytecodeAsString(bytecode);
                    var codeFile = testFolder + name + '.code';
                    //fs.writeFileSync(codeFile, formatted, 'utf8');
                    expected = fs.readFileSync(codeFile, 'utf8');
                    expect(expected).to.exist;  // jshint ignore:line
                    expect(formatted).to.equal(expected);
                }
            }
        });

    });

});
