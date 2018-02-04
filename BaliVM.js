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
var utilities = require('./utilities/BytecodeUtilities');
var LanguageCompiler = require('./compiler/LanguageCompiler').LanguageCompiler;
var ProcedureAnalyzer = require('./compiler/ProcedureAnalyzer').ProcedureAnalyzer;
var ProcedureAssembler = require('./compiler/ProcedureAssembler').ProcedureAssembler;
var VirtualMachine = require('./bvm/VirtualMachine').VirtualMachine;
var MethodContext = require('./bvm/MethodContext').MethodContext;

// TODO: replace with require('bali-virtual-machine/cloud')
var cloud = {
    readDocument: function(reference) {}
};


// PUBLIC FUNCTIONS

/**
 * This function takes a source code string containing a Bali block
 * and parses it into the corresponding parse tree structure.
 * 
 * @param {string} source The source code string.
 * @returns {BlockContext} The corresponding parse tree structure.
 */
exports.parseBlock = function(source) {
    var block = language.parseBlock(source);
    return block;
};


/**
 * This function takes a Bali document and formats it as source code.
 * 
 * @param {BlockContext} baliBlock The Bali block to be formatted.
 * @returns {string} The formatted source code string.
 */
exports.formatBlock = function(baliBlock) {
    var source = language.formatDocument(baliBlock, '');
    return source;
};


/**
 * This function takes a Bali document and formats it as source code. Each
 * line will be prepended with the specified padding string.
 * 
 * @param {BlockContext} baliBlock The Bali block to be formatted.
 * @param {string} padding The string that should be prepended to each line.
 * @returns {string} The formatted source code string.
 */
exports.formatBlockWithPadding = function(baliBlock, padding) {
    var source = language.formatDocument(baliBlock, padding);
    return source;
};


/**
 * This function compiles a Bali Document Language™ block.
 * 
 * @param {BlockContext} baliBlock The Bali block context to be compiled.
 * @returns {string} The resulting BaliVM assembly source code.
 */
exports.compileBlock = function(baliBlock) {
    var compiler = new LanguageCompiler();
    var procedure = compiler.compileBlock(baliBlock);
    return procedure;
};


/**
 * This function takes a source code string containing a BaliVM procedure
 * and parses it into a parse tree structure containing the same
 * procedure.
 * 
 * @param {string} source The source code.
 * @returns {object} The resulting parse tree.
 */
exports.parseProcedure = function(source) {
    var procedure = instructionSet.parseProcedure(source);
    return procedure;
};


/**
 * This function takes a parse tree structure containing a procedure
 * and formats it back into a source code string containing the BaliVM
 * procedure.
 * 
 * @param {object} procedure The parse tree structure to be formatted.
 * @returns {string} The resulting source code string.
 */
exports.formatProcedure = function(procedure) {
    var source = instructionSet.formatProcedure(procedure);
    return source;
};


/**
 * This function walks a parse tree structure containing a procedure
 * and generates the corresponding bytecode for the BaliVM.
 * 
 * @param {object} context The context information gathered by the
 * compiler and analyzer.
 * @param {object} procedure The parse tree structure to be assembled.
 * @returns {array} The assembled bytecode array.
 */
exports.assembleProcedure = function(context, procedure) {
    var analyzer = new ProcedureAnalyzer(context);
    analyzer.analyzeProcedure(procedure);
    var assembler = new ProcedureAssembler(context);
    var bytecode = assembler.assembleProcedure(procedure);
    return bytecode;
};


/**
 * This function analyzes bytecode and regenerates the source code
 * that was used to assemble the bytecode.
 * 
 * @param {object} context The context information gathered by the
 * compiler and analyzer.
 * @param {array} bytecode The bytecode array to be disassembled.
 * @returns {string} The regenerated source code.
 */
exports.disassembleBytecode = function(context, bytecode) {
    var assembler = new ProcedureAssembler(context);
    var procedure = assembler.disassembleBytecode(bytecode);
    return procedure;
};


/**
 * This function formats a bytecode array in a human/nerd readable format
 * that can be used to troubleshoot the bytecode.
 * 
 * @param {array} bytecode The bytecode array to be formatted.
 * @returns {string} The formatted string.
 */
exports.formatBytecode = function(bytecode) {
    var string = utilities.bytecodeAsString(bytecode);
    return string;
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
    var methodContext = new MethodContext(type, target, message, parameters);
    virtualMachine.pushContext(methodContext);
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

