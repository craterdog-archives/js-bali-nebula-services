/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
var BaliNotary = require('bali-digital-notary/BaliNotary');
var TestRepository = require('bali-cloud-api/LocalRepository');
var BaliAPI = require('bali-cloud-api/BaliAPI');
var BaliDocument = require('bali-document-notation/BaliDocument');
var compiler = require('../compiler/ProcedureCompiler');
var BaliProcedure = require('bali-instruction-set/BaliProcedure');
var analyzer = require('../assembler/ProcedureAnalyzer');
var assembler = require('../assembler/ProcedureAssembler');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var TaskContext = require('../bvm/TaskContext');
var VirtualMachine = require('../bvm/VirtualMachine');
var elements = require('bali-element-types');
var collections = require('bali-collection-types');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {
    var testDirectory = 'test/config/';
    var notary = BaliNotary.notary(testDirectory);
    var repository = TestRepository.repository(testDirectory);
    var environment = BaliAPI.environment(notary, repository);

    describe('Test the JUMP instruction.', function() {
        var taskContext;
/*
        it('should create the initial task context', function() {
            var source =
                    '\n' +
                    '1.IfStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.1.ConditionClause:\n' +
                    'PUSH ELEMENT `true`\n' +
                    'JUMP TO 1.2.ConditionClause ON FALSE\n' +
                    '\n' +
                    '1.1.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.1.ConditionClauseDone:\n' +
                    'JUMP TO 1.IfStatementDone\n' +
                    '\n' +
                    '1.2.ConditionClause:\n' +
                    'PUSH ELEMENT `false`\n' +
                    'JUMP TO 1.3.ConditionClause ON FALSE\n' +
                    '\n' +
                    '1.2.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.2.ConditionClauseDone:\n' +
                    'JUMP TO 1.IfStatementDone\n' +
                    '\n' +
                    '1.3.ConditionClause:\n' +
                    'PUSH ELEMENT `true`\n' +
                    'JUMP TO 1.4.ConditionClause ON TRUE\n' +
                    '\n' +
                    '1.3.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.3.ConditionClauseDone:\n' +
                    'JUMP TO 1.IfStatementDone\n' +
                    '\n' +
                    '1.4.ConditionClause:\n' +
                    'PUSH ELEMENT `false`\n' +
                    'JUMP TO 1.5.ConditionClause ON TRUE\n' +
                    '\n' +
                    '1.4.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.4.ConditionClauseDone:\n' +
                    'JUMP TO 1.IfStatementDone\n' +
                    '\n' +
                    '1.5.ConditionClause:\n' +
                    'PUSH ELEMENT `none`\n' +
                    'JUMP TO 1.6.ConditionClause ON NONE\n' +
                    '\n' +
                    '1.5.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.5.ConditionClauseDone:\n' +
                    'JUMP TO 1.IfStatementDone\n' +
                    '\n' +
                    '1.6.ConditionClause:\n' +
                    'PUSH ELEMENT `true`\n' +
                    'JUMP TO 1.IfStatementDone ON NONE\n' +
                    '\n' +
                    '1.6.1.EvaluateStatement:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.6.ConditionClauseDone:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n' +
                    '1.IfStatementDone:\n' +
                    'SKIP INSTRUCTION\n' +
                    '\n';
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
    
            source =
                    '\n[\n' +
                    '    $targetComponent: none\n' +
                    '    $typeReference: none\n' +
                    '    $procedureName: $dummy\n' +
                    '    $parameterValues: []\n' +
                    '    $literalValues: [true, false, none]\n' +
                    '    $variableValues: []\n' +
                    '    $bytecodeInstructions: [' + bytecodeInstructions + ']\n' +
                    '    $currentInstruction: none\n' +
                    '    $nextAddress: 1\n' +
                    ']\n';
            console.log('source: ' + source);
            var document = BaliDocument.fromSource(source);
            console.log('document: ' + document);
            var accountTag = new elements.Tag();
            var accountBalance = 100;
            // TODO: fill in document...
            taskContext = TaskContext.fromDocument(document);

            var bvm = VirtualMachine(taskContext, testDirectory);
            bvm.processInstructions();
        });
*/
    });

});
