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
var BaliDocument = require('bali-document-notation/BaliDocument');
var BaliProcedure = require('bali-instruction-set/BaliProcedure');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var parser = require('bali-document-notation/transformers/DocumentParser');
var analyzer = require('./compiler/TypeAnalyzer');
var compiler = require('./compiler/ProcedureCompiler');
var scanner = require('./assembler/ProcedureAnalyzer');
var assembler = require('./assembler/ProcedureAssembler');
var utilities = require('./utilities/BytecodeUtilities');
var VirtualMachine = require('./bvm/VirtualMachine').VirtualMachine;
var api = require('bali-cloud-api/BaliAPI');


// PUBLIC FUNCTIONS

/**
 * This function compiles a Bali Document Notation™ type.
 * 
 * @param {BaliDocument} type The Bali document containing the type definition to be compiled.
 * @param {Boolean} verbose Whether or not the assembly instructions should be included.
 * @returns {TreeNode} The full parse tree for the Bali type.
 */
exports.compileType = function(type, verbose) {
    analyzer.analyzeType(type);
    var procedures = type.getValue('$procedures');
    var iterator = procedures.iterator();
    while (iterator.hasNext()) {
        var component = iterator.getNext();
        var source = component.getValue('$source');
        var block = source.children[0];
        var procedure = block.children[0];
        source = compiler.compileProcedure(procedure, type);
        var instructions = BaliProcedure.fromSource(source);
        var symbols = scanner.extractSymbols(instructions);
        var bytecode = assembler.assembleProcedure(instructions, symbols);

        var catalog = component.children[1];
        var value;
        catalog.deleteKey('$instructions');
        catalog.deleteKey('$bytecode');
        if (verbose) {
            // add instructions to procedure catalog
            value = parser.parseExpression('"\n' + source.replace(/^/gm, '                ') + '\n"($mediatype: "application/basm")');
            catalog.setValue('$instructions', value);
        }
    
        // add bytecode to procedure catalog
        var base16 = utilities.bytecodeToBase16(bytecode, '                ');
        var binary = parser.parseExpression("'" + base16 + "\n            '" + '($mediatype: "application/bcod")');
        catalog.setValue('$bytecode', binary);
    }
    return type;
};


/**
 * This function processes a message using the Bali Virtual Machine™.
 * 
 * @param {Reference} targetReference A reference to the target that supports the message.
 * @param {Reference} typeReference A reference to the type containing the message definition.
 * @param {Symbol} message The symbol for the message to be processed.
 * @param {Collection} parameters The list or catalog of parameters that were passed with the message.
 */
exports.processMessage = function(targetReference, typeReference, message, parameters) {
    var document;
    // TODO: fill in document...
    var virtualMachine = VirtualMachine.fromDocument(document);
    virtualMachine.processInstructions();
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
