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
var documents = require('bali-document-notation/BaliDocuments');
var instructionSet = require('bali-instruction-set/BaliInstructionSet');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var analyzer = require('./compiler/TypeAnalyzer');
var compiler = require('./compiler/ProcedureCompiler');
var scanner = require('./assembler/ProcedureAnalyzer');
var assembler = require('./assembler/ProcedureAssembler');
var utilities = require('./utilities/BytecodeUtilities');
var VirtualMachine = require('./bvm/VirtualMachine').VirtualMachine;
var ProcedureContext = require('./bvm/ProcedureContext').ProcedureContext;

// TODO: replace with require('bali-virtual-machine/cloud')
var cloud = {
    readDocument: function(reference) {}
};


// PUBLIC FUNCTIONS

/**
 * This function compiles a Bali Document Notation™ type.
 * 
 * @param {String} source The Bali source code for the type to be compiled.
 * @param {Boolean} verbose Whether or not the assembly instructions should be included.
 * @returns {TreeNode} The full parse tree for the Bali type.
 */
exports.compileType = function(source, verbose) {
    var type = documents.parseDocument(source);
    analyzer.analyzeType(type);
    var procedures = documents.getValueForKey(type, '$procedures');
    var iterator = documents.iterator(procedures);
    while (iterator.hasNext()) {
        var component = iterator.getNext();
        source = documents.getValueForKey(component, '$source');
        var block = source.children[0];
        var procedure = block.children[0];
        source = compiler.compileProcedure(procedure, type);
        var instructions = instructionSet.parseProcedure(source);
        var symbols = scanner.extractSymbols(instructions);
        var bytecode = assembler.assembleProcedure(instructions, symbols);

        var catalog = component.children[1];
        var value;
        documents.deleteKey(catalog, '$instructions');
        documents.deleteKey(catalog, '$bytecode');
        if (verbose) {
            // add instructions to procedure catalog
            value = documents.parseExpression('"\n' + source.replace(/^/gm, '                ') + '\n"($mediatype: "application/basm")');
            documents.setValueForKey(catalog, '$instructions', value);
        }
    
        // add bytecode to procedure catalog
        var bytes = utilities.bytecodeToBytes(bytecode);
        var base16 = codex.base16Encode(bytes, '                ');
        var binary = documents.parseExpression("'" + base16 + "\n            '" + '($mediatype: "application/bcod")');
        documents.setValueForKey(catalog, '$bytecode', binary);
    }
    return type;
};


/**
 * This function formats a parse tree generated from a Bali Document Notation™ type.
 * 
 * @param {TreeNode} type The parse tree for the Bali type.
 * @returns {string} The The formatted Bali document for the type.
 */
exports.formatType = function(type) {
    var document = documents.formatParseTree(type);
    return document;
};


/**
 * This function processes a message using the Bali Virtual Machine™.
 * 
 * @param {Reference} typeReference A reference to the type containing the message definition.
 * @param {Reference} targetReference A reference to the target that supports the message.
 * @param {Symbol} message The symbol for the message to be processed.
 * @param {Collection} parameters The list or catalog of parameters that were passed with the message.
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
