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
    context.target = message.getValueForKey('$target');
    context.type = message.getValueForKey('$type');
    context.procedure = message.getValueForKey('$procedure');
    context.parameters = message.getValueForKey('parameters');
    context.address = 1;
    return context;
};


/*
 * The catalog is a javascript catalog not a Bali document catalog.
 */
exports.fromCatalog = function(catalog) {
    var context = new ProcedureContext();
    context.target = catalog.getValue('$target');
    context.type = catalog.getValue('$type');
    context.procedure = catalog.getValue('$procedure');
    context.literals = catalog.getValue('$literals');
    context.parameters = catalog.getValue('$parameters');
    context.variables = catalog.getValue('$variables');
    context.bytecode = codex.bytesToBytecode(catalog.getValue('$bytecode').value);
    context.address = catalog.getValue('$address').toNumber();
    return context;
};


function ProcedureContext(catalog) {
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;


ProcedureContext.prototype.accept = function(visitor) {
    visitor.visitProcedureContext(this);
};
