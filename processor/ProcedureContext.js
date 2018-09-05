/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

/*
 * This class defines the context for a procedure that is being executed by the
 * the Bali Virtual Machine™.
 */
var bytecode = require('../utilities/BytecodeUtilities');
var codex = require('bali-document-notation/utilities/EncodingUtilities');


/**
 * This function creates a new procedure context that is not initialized.
 * 
 * @returns {ProcedureContext} The new procedure context.
 */
exports.fromScratch = function() {
    var procedureContext = new ProcedureContext();
    return procedureContext;
};


/**
 * This function creates a new procedure context that is not initialized.
 * 
 * @param {Catalog} catalog The catalog containing the procedure context definition.
 * @returns {ProcedureContext} The corresponding procedure context.
 */
exports.fromCatalog = function(catalog) {
    var procedureContext = new ProcedureContext();
    procedureContext.targetComponent = catalog.getValue('$targetComponent');
    procedureContext.typeReference = catalog.getValue('$typeReference');
    procedureContext.procedureName = catalog.getValue('$procedureName');
    procedureContext.parameterValues = catalog.getValue('$parameterValues');
    procedureContext.literalValues = catalog.getValue('$literalValues');
    procedureContext.variableValues = catalog.getValue('$variableValues');
    procedureContext.bytecodeInstructions = catalog.getValue('bytecodeInstructions');
    procedureContext.currentInstruction = catalog.getValue('$currentInstruction');
    procedureContext.nextAddress = catalog.getValue('$nextAddress');
    return procedureContext;
};


function ProcedureContext() {
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;


ProcedureContext.prototype.accept = function(visitor) {
    visitor.visitProcedureContext(this);
};


ProcedureContext.prototype.toString = function() {
    var string = this.toBali();
    return string;
};


ProcedureContext.prototype.toBali = function(padding) {
    padding = padding ? padding : '';
    var string =  '[\n' +
        padding + '    $targetComponent: %targetComponent\n' +
        padding + '    $typeReference: %typeReference\n' +
        padding + '    $procedureName: %procedureName\n' +
        padding + '    $parameterValues: %parameterValues\n' +
        padding + '    $literalValues: %literalValues\n' +
        padding + '    $variableValues: %variableValues\n' +
        padding + '    $bytecodeInstructions: %bytecodeInstructions\n' +
        padding + '    $currentInstruction: %currentInstruction\n' +
        padding + '    $nextAddress: %nextAddress\n' +
        padding + ']($type: ProcedureContext)';
    string = string.replace(/%targetComponent/, this.targetComponent.toBali(padding + '    '));
    string = string.replace(/%typeReference/, this.typeReference.toBali());
    string = string.replace(/%procedureName/, this.procedureName.toBali());
    string = string.replace(/%parameterValues/, this.parameterValues.toBali(padding + '    '));
    string = string.replace(/%literalValues/, this.literalValues.toBali(padding + '    '));
    string = string.replace(/%variableValues/, this.variableValues.toBali(padding + '    '));
    string = string.replace(/%bytecodeInstructions/, this.bytecodeInstructions.toBali(padding + '    '));
    string = string.replace(/%currentInstruction/, this.currentInstruction.toBali());
    string = string.replace(/%nextAddress/, this.nextAddress.toBali());
    return string;
};

