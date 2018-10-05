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
var documentParser = require('bali-document-notation/transformers/DocumentParser');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var importer = require('bali-primitive-types/transformers/ComponentImporter');
var Catalog = require('bali-primitive-types/collections/Catalog');
var List = require('bali-primitive-types/collections/List');
var procedureParser = require('bali-instruction-set/transformers/ProcedureParser');
var compiler = require('./compiler/ProcedureCompiler');
var assembler = require('./compiler/ProcedureAssembler');
var utilities = require('./utilities/BytecodeUtilities');
var VirtualMachine = require('./processor/VirtualMachine').VirtualMachine;


// PUBLIC FUNCTIONS

/**
 * This function compiles a Bali Document Notation™ type.
 * 
 * @param {Object} cloud The client API to the cloud environment.
 * @param {Reference} citation The citation referencing the type definition to be compiled.
 * @returns {Reference} A citation referencing the compiled type.
 */
exports.compileType = function(cloud, citation) {
    // create the compilation context
    var context = {
        ancestry: [citation],
        dependencies: []
    };

    // retrieve the type definition
    var type = cloud.retrieveDocument(citation);

    // traverse the ancestry for the type
    var parent = type.getValue('$parent');
    while (parent) {
        context.ancestry.push(parent);
        var superType = cloud.retrieveDocument(parent);
        parent = superType.getValue('$parent');
    }

    // retrieve any dependencies
    var iterator;
    var dependencies = type.getValue('$dependencies');
    if (dependencies) {
        iterator = dependencies.iterator();
        while (iterator.hasNext()) {
            var dependency = iterator.getNext();
            context.dependencies.push(dependency);
        }
    }

    // extract the literals and procedure names from the type definition parse tree
    compiler.analyzeType(type, context);

    // construct the context for the compiled type
    var typeContext = Catalog.fromScratch();
    typeContext.setValue('$ancestry', List.fromCollection(context.ancestry));
    typeContext.setValue('$dependencies', List.fromCollection(context.dependencies));
    typeContext.setValue('$literals', List.fromCollection(context.literals));
    typeContext.setValue('$names', List.fromCollection(context.names));
    var procedures = Catalog.fromScratch();
    typeContext.setValue('$procedures', procedures);

    // compile each procedure defined in the type definition
    iterator = type.getValue('$procedures').iterator();
    while (iterator.hasNext()) {
        var procedureContext = Catalog.fromScratch();

        // retrieve the source code for the procedure
        var association = iterator.getNext();
        var procedureName = association.children[0].toString();
        var code = association.children[1].getValue('$code');
        var procedure = code.children[0].children[0];

        // compile and assemble the source code
        var instructions = compiler.compileProcedure(cloud, procedure, context);
        procedure = procedureParser.parseProcedure(instructions);
        instructions = documentParser.parseExpression('"\n' + instructions.replace(/^/gm, '    ') + '\n"($mediatype: "application/basm")');
        instructions = importer.importComponent(instructions);
        procedureContext.setValue('$intructions', instructions);
        var bytecode = assembler.assembleProcedure(procedure, context);
        var base16 = codex.base16Encode(utilities.bytecodeToBytes(bytecode), '            ');
        bytecode = documentParser.parseExpression("'" + base16 + "\n            '" + '($base: 16, $mediatype: "application/bcod")');
        bytecode = importer.importComponent(bytecode);
        procedureContext.setValue('$bytecode', bytecode);

        procedures.setValue(procedureName, procedureContext);
    }

    // checkin the new compiled type
    //TODO: add implementation

    //return citation;
    return typeContext;
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
