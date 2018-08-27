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
 * This class defines the context for a procedure that is being executed by the
 * the Bali Virtual Machine™.
 */
var codex = require('../utilities/BytecodeUtilities');


/*
 * The message is a Bali document catalog.
 */
exports.fromMessage = function(message) {
    var context = new ProcedureContext();
    context.targetComponent = message.getValueForKey('$targetComponent');
    context.typeReference = message.getValueForKey('$typeReference');
    context.procedureName = message.getValueForKey('$procedureName');
    context.parameterValues = message.getValueForKey('parameterValues');
    context.nextAddress = 1;
    return context;
};


/*
 * The catalog is a javascript catalog not a Bali document catalog.
 */
exports.fromCatalog = function(catalog) {
    var context = new ProcedureContext();
    context.targetComponent = catalog.getValue('$targetComponent');
    context.typeReference = catalog.getValue('$typeReference');
    context.procedureName = catalog.getValue('$procedureName');
    context.literalValues = catalog.getValue('$literalValues');
    context.parameterValues = catalog.getValue('$parameterValues');
    context.variableValues = catalog.getValue('$variableValues');
    context.bytecodeInstructions = codex.bytesToBytecode(catalog.getValue('$bytecodeInstructions').value);
    context.currentInstruction = catalog.getValue('$currentInstruction').toNumber();
    context.nextAddress = catalog.getValue('$nextAddress').toNumber();
    return context;
};


function ProcedureContext(catalog) {
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;


ProcedureContext.prototype.accept = function(visitor) {
    visitor.visitProcedureContext(this);
};
