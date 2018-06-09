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
    var procedures = language.getValueForKey(tree, '$procedures');
    var iterator = language.iterator(procedures);
    while (iterator.hasNext()) {
        var procedure = iterator.getNext();
        var block = language.getValueForKey(tree, '$source');
        var instructions = compiler.compileProcedure(block, context);
        var list = instructionSet.parseProcedure(instructions);
        var symbols = scanner.extractSymbols(list);
        var bytecode = assembler.assembleBytecode(list, symbols);

        // add instructions to procedure catalog
        var catalog = procedure.children[1];
        var value = language.parseExpression('"' + instructions + '"' + '($mediatype: "application/basm")');
        language.setValueForKey(catalog, '$instructions', value);
    
        // add bytecode to procedure catalog
        var bytes = "";
        for (var i = 0; i < bytecode.length; i++) {
            bytes += utilities.shortToBytes(bytecode[i]);
        }
        var binary = utilities.base16Encode(bytes, '                ');
        value = language.parseExpression("'" + binary + "'" + '($mediatype: "application/bcod")');
        language.setValueForKey(catalog, '$bytecode', value);
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
