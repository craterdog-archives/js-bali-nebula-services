/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

/*
 * This library provides access to functions that are needed within the
 * Bali Cloud Operating System™. For more information about the Bali Cloud
 * see <https://github.com/craterdog-bali/bali-reference-guide/wiki>.
 */
var language = require('bali-language/BaliLanguage');
var syntax = require('bali-language/syntax');
var types = require('bali-language/syntax/NodeTypes');
var instructionSet = require('bali-instruction-set/BaliInstructionSet');
var analyzer = require('./compiler/Analyzer');
var compiler = require('./compiler/Compiler');
var scanner = require('./assembler/Scanner');
var assembler = require('./assembler/Assembler');
var utilities = require('./utilities/EncodingUtilities');
var VirtualMachine = require('./bvm/VirtualMachine').VirtualMachine;
var ProcedureContext = require('./bvm/ProcedureContext').ProcedureContext;

// TODO: replace with require('bali-virtual-machine/cloud')
var cloud = {
    readDocument: function(reference) {}
};


// PUBLIC FUNCTIONS

/**
 * This function compiles a Bali Document Language™ type.
 * 
 * @param {string} document The Bali document for the type to be compiled.
 * @returns {TreeNode} The full parse tree for the Bali type.
 */
exports.compileType = function(document) {
    var tree = language.parseDocument(document);
    var context = analyzer.analyzeType(tree);
    var procedures = extractProcedures(tree);
    for (var i = 0; i < procedures.length; i++) {
        var procedure = procedures[i];
        var block = extractBlock(procedure);
        var instructions = compiler.compileBlock(block, context);
        var list = instructionSet.parseProcedure(instructions);
        var symbols = scanner.extractSymbols(list);
        var bytecode = assembler.assembleBytecode(list, symbols);
        updateProcedure(procedure, instructions, bytecode);
    }
    return tree;
};


/**
 * This function formats a parse tree generated from a Bali Document Language™ type.
 * 
 * @param {TreeNode} type The parse tree for the Bali type.
 * @returns {string} The The formatted Bali document for the type.
 */
exports.formatType = function(type) {
    var document = language.formatDocument(type);
    return document;
};


/**
 * This function processes a message using the Bali Virtual Machine™.
 * 
 * @param {Reference} typeReference A reference to the type containing the message definition.
 * @param {Reference} targetReference A reference to the target that supports the message.
 * @param {Symbol} message The symbol for the message to be processed.
 * @param {Composite} parameters The list or catalog of parameters that were passed with the message.
 */
exports.processMessage = function(typeReference, targetReference, message, parameters) {
    var type = cloud.readDocument(typeReference);
    var target = cloud.readDocument(targetReference);
    var virtualMachine = new VirtualMachine();
    var procedureContext = new ProcedureContext(type, target, message, parameters);
    virtualMachine.pushContext(procedureContext);
    virtualMachine.processProcedure();
};


/**
 * This function continues processing a previous submitted message using the
 * Bali Virtual Machine™. The task context is retrieved from the Bali Document Repository™.
 * 
 * @param {Reference} taskReference A reference to an existing task context.
 */
exports.continueProcessing = function(taskReference) {
    var virtualMachine = new VirtualMachine(taskReference);
    virtualMachine.processProcedure();
};


// PRIVATE FUNCTIONS

function extractProcedures(type) {
    var procedures = [];
    var catalog = type.children[0].children[0];
    for (var i = 0; i < catalog.children.length; i++) {
        var association = catalog.children[i];
        var key = association.children[0];
        var value = association.children[1];
        if (key.type === types.SYMBOL && key.value === '$procedures') {
            procedures = value.children[0].children;
            break;
        }
    }
    return procedures;
}


/*
 * This function extracts a block tree node from an association tree node whose symbol is
 * the procedure name and the value is a structure tree node containing the source, instructions,
 * and bytecode for the procedure.
 */
function extractBlock(procedure) {
    var block;
    var catalog = procedure.children[1].children[0];
    for (var i = 0; i < catalog.children.length; i++) {
        var association = catalog.children[i];
        var key = association.children[0];
        var value = association.children[1];
        if (key.type === types.SYMBOL && key.value === '$source') {
            block = value;
            break;
        }
    }
    return block;
}


function updateProcedure(procedure, instructions, bytecode) {
    // remove existing instructions and bytecode from procedure catalog
    var catalog = procedure.children[1].children[0];
    procedure.children[1].children[0].children = catalog.children.slice(0, 1);

    // add instructions to procedure catalog
    var association = new syntax.TreeNode(types.ASSOCIATION);
    var key = new syntax.TerminalNode(types.SYMBOL, '$instructions');
    var value = new syntax.TerminalNode(types.TEXT, '"' + instructions + '"');
    association.addChild(key);
    association.addChild(value);
    catalog.addChild(association);

    // add bytecode to procedure catalog
    var structure = new syntax.TreeNode(types.STRUCTURE);
    var list = new syntax.TreeNode(types.LIST);
    structure.addChild(list);
    for (var i = 0; i < bytecode.length; i++) {
        var bytes = utilities.shortToBytes(bytecode[i]);
        var binary = new syntax.TerminalNode(types.BINARY, "'" + utilities.base16Encode(bytes) + "'");
        list.addChild(binary);
    }
    association = new syntax.TreeNode(types.ASSOCIATION);
    key = new syntax.TerminalNode(types.SYMBOL, '$bytecode');
    association.addChild(key);
    association.addChild(structure);
    catalog.addChild(association);
}


// PRIVATE CLASSES

function ExtractingVisitor() {
    this.procedures = [];
    return this;
}
ExtractingVisitor.prototype.constructor = ExtractingVisitor;


// arithmeticExpression: expression ('*' | '/' | '//' | '+' | '-') expression
ExtractingVisitor.prototype.visitArithmeticExpression = function(tree) {
};


// association: element ':' expression
ExtractingVisitor.prototype.visitAssociation = function(tree) {
    var element = tree.children[0];
    if (element.type === types.SYMBOL && element.value === '$procedures') {
        tree.children[1].accept(this);
    }
};


// block: '{' procedure '}'
ExtractingVisitor.prototype.visitBlock = function(tree) {
    this.blocks.push(tree);
};


// breakClause: 'break' 'loop'
ExtractingVisitor.prototype.visitBreakClause = function(tree) {
};


// catalog:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty catalog*/
ExtractingVisitor.prototype.visitCatalog = function(tree) {
    var associations = tree.children;
    for (var i = 0; i < associations.length; i++) {
        this.document += ', ';
        associations[i].accept(this);
    }
};


// checkoutClause: 'checkout' recipient 'from' expression
ExtractingVisitor.prototype.visitCheckoutClause = function(tree) {
};


// commitClause: 'commit' expression 'to' expression
ExtractingVisitor.prototype.visitCommitClause = function(tree) {
};


// comparisonExpression: expression ('<' | '=' | '>' | 'is' | 'matches') expression
ExtractingVisitor.prototype.visitComparisonExpression = function(tree) {
};


// complementExpression: 'not' expression
ExtractingVisitor.prototype.visitComplementExpression = function(tree) {
};


// continueClause: 'continue' 'loop'
ExtractingVisitor.prototype.visitContinueClause = function(tree) {
};


// defaultExpression: expression '?' expression
ExtractingVisitor.prototype.visitDefaultExpression = function(tree) {
};


// dereferenceExpression: '@' expression
ExtractingVisitor.prototype.visitDereferenceExpression = function(tree) {
};


// discardClause: 'discard' expression
ExtractingVisitor.prototype.visitDiscardClause = function(tree) {
};


// document: NEWLINE* component NEWLINE* EOF
ExtractingVisitor.prototype.visitDocument = function(tree) {
    tree.children[0].accept(this);  // component
};


// element:
//     binary |
//     duration |
//     moment |
//     number |
//     percent |
//     probability |
//     reference |
//     symbol |
//     tag |
//     template |
//     text |
//     version
ExtractingVisitor.prototype.visitElement = function(terminal) {
};


// evaluateClause: (recipient ':=')? expression
ExtractingVisitor.prototype.visitEvaluateClause = function(tree) {
};


// exponentialExpression: <assoc=right> expression '^' expression
ExtractingVisitor.prototype.visitExponentialExpression = function(tree) {
};


// factorialExpression: expression '!'
ExtractingVisitor.prototype.visitFactorialExpression = function(tree) {
};


// function: IDENTIFIER
ExtractingVisitor.prototype.visitFunction = function(terminal) {
};


// functionExpression: function parameters
ExtractingVisitor.prototype.visitFunctionExpression = function(tree) {
};


// handleClause: 'handle' symbol 'matching' expression 'with' block
ExtractingVisitor.prototype.visitHandleClause = function(tree) {
};


// ifClause: 'if' expression 'then' block ('else' 'if' expression 'then' block)* ('else' block)?
ExtractingVisitor.prototype.visitIfClause = function(tree) {
};


// indices: '[' list ']'
ExtractingVisitor.prototype.visitIndices = function(tree) {
};


// inversionExpression: ('-' | '/' | '*') expression
ExtractingVisitor.prototype.visitInversionExpression = function(tree) {
};


// list:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty list*/
ExtractingVisitor.prototype.visitList = function(tree) {
};


// logicalExpression: expression ('and' | 'sans' | 'xor' | 'or') expression
ExtractingVisitor.prototype.visitLogicalExpression = function(tree) {
};


// magnitudeExpression: '|' expression '|'
ExtractingVisitor.prototype.visitMagnitudeExpression = function(tree) {
};


// message: IDENTIFIER
ExtractingVisitor.prototype.visitMessage = function(terminal) {
};


// messageExpression: expression '.' message parameters
ExtractingVisitor.prototype.visitMessageExpression = function(tree) {
};


// parameters: '(' composite ')'
ExtractingVisitor.prototype.visitParameters = function(tree) {
};


// precedenceExpression: '(' expression ')'
ExtractingVisitor.prototype.visitPrecedenceExpression = function(tree) {
};


// procedure:
//     statement (';' statement)* |
//     NEWLINE (statement NEWLINE)* |
//     /*empty procedure*/
ExtractingVisitor.prototype.visitProcedure = function(tree) {
};


// publishClause: 'publish' expression
ExtractingVisitor.prototype.visitPublishClause = function(tree) {
};


// queueClause: 'queue' expression 'on' expression
ExtractingVisitor.prototype.visitQueueClause = function(tree) {
};


// range: expression '..' expression
ExtractingVisitor.prototype.visitRange = function(tree) {
};


// recipient: symbol | variable indices
ExtractingVisitor.prototype.visitRecipient = function(tree) {
};


// returnClause: 'return' expression?
ExtractingVisitor.prototype.visitReturnClause = function(tree) {
};


// saveClause: 'save' expression 'to' expression
ExtractingVisitor.prototype.visitSaveClause = function(tree) {
};


// selectClause: 'select' expression 'from' (expression 'do' block)+ ('else' block)?
ExtractingVisitor.prototype.visitSelectClause = function(tree) {
};


// statement: (
//     evaluateClause |
//     checkoutClause |
//     saveClause |
//     discardClause |
//     commitClause |
//     publishClause |
//     queueClause |
//     waitClause |
//     ifClause |
//     selectClause |
//     whileClause |
//     withClause |
//     continueClause |
//     breakClause |
//     returnClause |
//     throwClause
// ) handleClause*
ExtractingVisitor.prototype.visitStatement = function(tree) {
};


// structure: '[' composite ']'
ExtractingVisitor.prototype.visitStructure = function(tree) {
    tree.children[0].accept(this);
};


// subcomponentExpression: expression indices
ExtractingVisitor.prototype.visitSubcomponentExpression = function(tree) {
};


// task: SHELL NEWLINE* procedure NEWLINE* EOF
ExtractingVisitor.prototype.visitTask = function(tree) {
};


// throwClause: 'throw' expression
ExtractingVisitor.prototype.visitThrowClause = function(tree) {
};


// variable: IDENTIFIER
ExtractingVisitor.prototype.visitVariable = function(terminal) {
};


// waitClause: 'wait' 'for' recipient 'from' expression
ExtractingVisitor.prototype.visitWaitClause = function(tree) {
};


// whileClause: 'while' expression 'do' block
ExtractingVisitor.prototype.visitWhileClause = function(tree) {
};


// withClause: 'with' ('each' symbol 'in')? expression 'do' block
ExtractingVisitor.prototype.visitWithClause = function(tree) {
};
