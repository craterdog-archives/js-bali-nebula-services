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


/**
 * This constructor creates a procedure context for a function or document message.
 * 
 * @constructor
 * @param {Catalog} catalog The catalog containing the procedure context attributes. 
 * @returns {ProcedureContext} The new procedure context.
 */
function ProcedureContext(catalog) {
    if (catalog) {
        this.target = catalog.getValue('$target');
        this.type = catalog.getValue('$type');
        this.procedure = catalog.getValue('$procedure');
        this.parameters = catalog.getValue('$parameters');
        this.literals = catalog.getValue('$literals');
        this.variables = catalog.getValue('$variables');
        this.bytecode = catalog.getValue('$bytecode');
        this.address = catalog.getValue('$address').toNumber();
    }
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;
exports.ProcedureContext = ProcedureContext;


ProcedureContext.prototype.accept = function(visitor) {
    visitor.visitProcedureContext(this);
};
