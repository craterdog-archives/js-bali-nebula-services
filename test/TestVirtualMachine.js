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
var TaskContext = require('../bvm/TaskContext');
var VirtualMachine = require('../bvm/VirtualMachine');
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
        '               <bali:[$protocol:v1,$tag:#ZQMQ8BGN43Y146KCXX24ZASF0GDJ5YDZ,$version:v1,$digest:none]>\n' +
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
            var testFile = 'test/bvm/JUMP.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toString().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var bvm = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(bvm.procedureContext.nextAddress).to.equal(1);

            // 1.IfStatement:
            // SKIP INSTRUCTION
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(2);

            // 1.1.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.IfStatementDone ON FALSE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(4);

            // 1.1.1.EvaluateStatement:
            // SKIP INSTRUCTION
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(5);

            // 1.2.ConditionClause:
            // PUSH ELEMENT `false`
            // JUMP TO 1.3.ConditionClause ON FALSE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(8);

            // 1.2.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.3.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.4.ConditionClause ON TRUE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(11);

            // 1.3.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.4.ConditionClause:
            // PUSH ELEMENT `false`
            // JUMP TO 1.IfStatementDone ON TRUE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(13);

            // 1.4.1.EvaluateStatement:
            // SKIP INSTRUCTION
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(14);

            // 1.5.ConditionClause:
            // PUSH ELEMENT `none`
            // JUMP TO 1.6.ConditionClause ON NONE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(17);

            // 1.5.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone

            // 1.6.ConditionClause:
            // PUSH ELEMENT `true`
            // JUMP TO 1.IfStatementDone ON NONE
            bvm.step();
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(19);

            // 1.6.1.EvaluateStatement:
            // JUMP TO 1.IfStatementDone
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(20);

            // 1.IfStatementDone:
            // SKIP INSTRUCTION
            bvm.step();
            expect(bvm.procedureContext.nextAddress).to.equal(21);

            // EOF
            expect(bvm.step()).to.equal(false);
            expect(bvm.taskContext.clockCycles).to.equal(17);
            expect(bvm.taskContext.accountBalance).to.equal(983);
            expect(bvm.taskContext.processorStatus).to.equal('$active');
            expect(bvm.taskContext.componentStack.length).to.equal(0);
        });

    });

    describe('Test the PUSH and POP instructions.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/bvm/PUSH-POP.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toString().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var bvm = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(bvm.procedureContext.nextAddress).to.equal(1);

            // 1.PushHandler
            // PUSH HANDLER 3.PushCode
            bvm.step();
            expect(bvm.taskContext.handlerStack.length).to.equal(1);

            // 2.PushElement
            // PUSH ELEMENT "five"
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);

            // 3.PushCode
            // PUSH CODE `{return prefix + name + suffix}`
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(2);

            // 4.PopHandler
            // POP HANDLER
            bvm.step();
            expect(bvm.taskContext.handlerStack.length).to.equal(0);

            // 5.PopComponent
            // POP COMPONENT
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);

            // EOF
            expect(bvm.step()).to.equal(false);
            expect(bvm.taskContext.clockCycles).to.equal(5);
            expect(bvm.taskContext.accountBalance).to.equal(995);
            expect(bvm.taskContext.processorStatus).to.equal('$active');
        });

    });

    describe('Test the LOAD and STORE instructions.', function() {

        it('should create the initial task context', function() {
            var testFile = 'test/bvm/LOAD-STORE.basm';
            var source = fs.readFileSync(testFile, 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = BaliProcedure.fromSource(source);
            var symbols = analyzer.extractSymbols(procedure);
            console.log('symbols: ' + JSON.stringify(symbols, null, 2));
            var bytecodeInstructions = assembler.assembleProcedure(procedure, symbols);
            source = TASK_TEMPLATE;
            // NOTE: must remove the back tick delimiters from the literal values
            source = source.replace(/%literalValues/, symbols.literals.toString().replace(/\`/g, ''));
            source = source.replace(/%bytecodeInstructions/, bytecodeInstructions);
            console.log('task: ' + source);
            var document = BaliDocument.fromSource(source);
            taskContext = TaskContext.fromDocument(document);
        });

        it('should execute the test instructions', function() {
            var bvm = VirtualMachine.fromDocument(taskContext, testDirectory);
            expect(bvm.procedureContext.nextAddress).to.equal(1);

            // 1.LoadParameter:
            // LOAD PARAMETER $x
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);
            expect(bvm.taskContext.componentStack.peek().toString()).to.equal('"This is a text string."');

            // 2.StoreVariable:
            // STORE VARIABLE $foo
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(0);
            expect(bvm.procedureContext.variableValues[0].toString()).to.equal('"This is a text string."');

            // 3.LoadVariable:
            // LOAD VARIABLE $foo
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);
            expect(bvm.taskContext.componentStack.peek().toString()).to.equal('"This is a text string."');

            // 4.StoreDraft:
            // STORE DRAFT $document
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(0);
            // LOAD DOCUMENT $document
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);
            expect(bvm.taskContext.componentStack.peek().documentContent.toString()).to.equal('"This is a text string."');

            // 5.StoreDocument:
            // STORE DOCUMENT $document
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(0);

            // 6.LoadDocument:
            // LOAD DOCUMENT $document

            // 7.StoreMessage:
            // STORE MESSAGE $queue

            // 8.LoadMessage:
            // LOAD MESSAGE $queue

            /*
----------------------------

            // 2.PushElement
            // PUSH ELEMENT "five"
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);

            // 3.PushCode
            // PUSH CODE `{return prefix + name + suffix}`
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(2);

            // 4.PopHandler
            // POP HANDLER
            bvm.step();
            expect(bvm.taskContext.handlerStack.length).to.equal(0);

            // 5.PopComponent
            // POP COMPONENT
            bvm.step();
            expect(bvm.taskContext.componentStack.length).to.equal(1);

            // EOF
            expect(bvm.step()).to.equal(false);
            expect(bvm.taskContext.clockCycles).to.equal(5);
            expect(bvm.taskContext.accountBalance).to.equal(995);
            expect(bvm.taskContext.processorStatus).to.equal('$active');
            */
        });

    });

});