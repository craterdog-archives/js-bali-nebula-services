/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
var TestRepository = require('bali-cloud-api/LocalRepository');
var BaliAPI = require('bali-cloud-api/BaliAPI');
var BaliDocument = require('bali-document-notation/BaliDocument');
var compiler = require('../compiler/ProcedureCompiler');
var BaliProcedure = require('bali-instruction-set/BaliProcedure');
var analyzer = require('../assembler/ProcedureAnalyzer');
var assembler = require('../assembler/ProcedureAssembler');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var utilities = require('../utilities/BytecodeUtilities');
var TaskContext = require('../processor/TaskContext');
var VirtualMachine = require('../processor/VirtualMachine');
var elements = require('bali-element-types');
var collections = require('bali-collection-types');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


/*  uncomment to generate a new notary key and certificate
var testDirectory = 'test/config/';
var notary = require('bali-digital-notary/BaliNotary').notary(testDirectory);
var certificate = notary.generateKeys();
var citation = notary.citation();
var repository = TestRepository.repository(testDirectory);
repository.storeCertificate(citation.tag, citation.version, certificate);
*/

var TASK_TEMPLATE =
        '[\n' +
        '   $taskTag: #Y29YH82BHG4SPTGWGFRYBL4RQ33GTX59\n' +
        '   $accountTag: #641ZH7VZKQW47HBJGXRCAHKT859YX25G\n' +
        '   $accountBalance: 1000\n' +
        '   $processorStatus: $active\n' +
        '   $clockCycles: 0\n' +
        '   $componentStack: []($type: Stack)\n' +
        '   $handlerStack: []($type: Stack)\n' +
        '   $procedureStack: [\n' +
        '       [\n' +
        '           $targetComponent: none\n' +
        '           $typeReference: none\n' +
        '           $procedureName: $dummy\n' +
        '           $parameterValues: ["This is a text string.", 2, 5]\n' +
        '           $literalValues: [%literalValues]\n' +
        '           $variableValues: [\n' +
        '               none\n' +
        '               <bali:[$protocol:v1,$tag:#LGLHW28KH99AXZZDTFXV14BX8CF2F68N,$version:v2.3,$digest:none]>\n' +
        '               #ZQMQ8BGN43Y146KCXX24ZASF0GDJ5YDZ\n' +
        '           ]\n' +
        '           $bytecodeInstructions: \'\n' +
        '               %bytecodeInstructions\n' +
        '           \'($mediatype: "application/bcod")\n' +
        '           $currentInstruction: 0\n' +
        '           $nextAddress: 1\n' +
        '       ]($type: ProcedureContext)\n' +
        '   ]($type: Stack)\n' +
        ']($type: TaskContext)';

describe('Bali Virtual Machine™', function() {
    var testDirectory = 'test/config/';
    var taskContext;

    describe('Test the JUMP instruction.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/processor/JUMP.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toBali().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var processor = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(processor.procedureContext.nextAddress).to.equal(1);

            // 1.IfStatement:
            // SKIP INSTRUCTION
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(2);

            // 1.1.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.IfStatementDone ON FALSE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(4);

            // 1.1.1.EvaluateStatement:
            // SKIP INSTRUCTION
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(5);

            // 1.2.ConditionClause:
            // PUSH ELEMENT `false`
            // JUMP TO 1.3.ConditionClause ON FALSE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(8);

            // 1.2.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.3.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.4.ConditionClause ON TRUE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(11);

            // 1.3.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.4.ConditionClause:
            // PUSH ELEMENT `false`
            // JUMP TO 1.IfStatementDone ON TRUE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(13);

            // 1.4.1.EvaluateStatement:
            // SKIP INSTRUCTION
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(14);

            // 1.5.ConditionClause:
            // PUSH ELEMENT `none`
            // JUMP TO 1.6.ConditionClause ON NONE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(17);

            // 1.5.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.6.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.IfStatementDone ON NONE
            processor.step();
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(19);

            // 1.6.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(20);

            // 1.IfStatementDone:
            // SKIP INSTRUCTION
            processor.step();
            expect(processor.procedureContext.nextAddress).to.equal(21);

            // EOF
            expect(processor.step()).to.equal(false);
            expect(processor.taskContext.clockCycles).to.equal(17);
            expect(processor.taskContext.accountBalance).to.equal(983);
            expect(processor.taskContext.processorStatus).to.equal('$active');
            expect(processor.taskContext.componentStack.length).to.equal(0);
        });

    });

    describe('Test the PUSH and POP instructions.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/processor/PUSH-POP.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toBali().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var processor = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(processor.procedureContext.nextAddress).to.equal(1);

            // 1.PushHandler:
            // PUSH HANDLER 3.PushCode
            processor.step();
            expect(processor.taskContext.handlerStack.length).to.equal(1);

            // 2.PushElement:
            // PUSH ELEMENT "five"
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);

            // 3.PushCode:
            // PUSH CODE `{return prefix + name + suffix}`
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(2);

            // 4.PopHandler:
            // POP HANDLER
            processor.step();
            expect(processor.taskContext.handlerStack.length).to.equal(0);

            // 5.PopComponent:
            // POP COMPONENT
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);

            // EOF
            expect(processor.step()).to.equal(false);
            expect(processor.taskContext.clockCycles).to.equal(5);
            expect(processor.taskContext.accountBalance).to.equal(995);
            expect(processor.taskContext.processorStatus).to.equal('$active');
        });

    });

    describe('Test the LOAD and STORE instructions.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/processor/LOAD-STORE.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toBali().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var processor = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(processor.procedureContext.nextAddress).to.equal(1);

            // 1.LoadParameter:
            // LOAD PARAMETER $x
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().toBali()).to.equal('"This is a text string."');

            // 2.StoreVariable:
            // STORE VARIABLE $foo
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(0);
            expect(processor.procedureContext.variableValues[0].toBali()).to.equal('"This is a text string."');

            // 3.LoadVariable:
            // LOAD VARIABLE $foo
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().toBali()).to.equal('"This is a text string."');

            // 4.StoreDraft:
            // STORE DRAFT $document
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(0);
            // LOAD DOCUMENT $document
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().documentContent.toBali()).to.equal('"This is a text string."');

            // 5.StoreDocument:
            // STORE DOCUMENT $document
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(0);

            // 6.LoadDocument:
            // LOAD DOCUMENT $document
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().documentContent.toBali()).to.equal('"This is a text string."');

            // 7.StoreMessage:
            // STORE MESSAGE $queue
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(0);

            // 8.LoadMessage:
            // LOAD MESSAGE $queue
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().documentContent.toBali()).to.equal('"This is a text string."');

            // EOF
            expect(processor.step()).to.equal(false);
            expect(processor.taskContext.clockCycles).to.equal(9);
            expect(processor.taskContext.accountBalance).to.equal(991);
            expect(processor.taskContext.processorStatus).to.equal('$active');
        });

    });

    describe('Test the INVOKE instructions.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/processor/INVOKE.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toBali().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var processor = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(processor.procedureContext.nextAddress).to.equal(1);

            // 1.Invoke:
            // INVOKE $random
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);

            // 2.InvokeWithParameter:
            // PUSH ELEMENT `3`
            processor.step();
            // INVOKE $factorial WITH PARAMETER
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(2);
            expect(processor.taskContext.componentStack.peek().toBali()).to.equal('6');

            // 3.InvokeWith2Parameters:
            // PUSH ELEMENT `5`
            processor.step();
            // INVOKE $sum WITH 2 PARAMETERS
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(2);
            expect(processor.taskContext.componentStack.peek().toBali()).to.equal('11');

            // 4.InvokeWith3Parameters:
            // PUSH ELEMENT `13`
            processor.step();
            // INVOKE $default WITH 3 PARAMETERS
            processor.step();
            expect(processor.taskContext.componentStack.length).to.equal(1);
            expect(processor.taskContext.componentStack.peek().toBali()).to.equal('11');

            // EOF
            expect(processor.step()).to.equal(false);
            expect(processor.taskContext.clockCycles).to.equal(7);
            expect(processor.taskContext.accountBalance).to.equal(993);
            expect(processor.taskContext.processorStatus).to.equal('$active');
        });

    });

});
