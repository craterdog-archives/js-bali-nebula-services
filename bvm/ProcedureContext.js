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
 * @param {object} target The optional target on which the procedure operates.
 * @param {object} type The type containing the procedure definition.
 * @param {string} procedure The name of the procedure to be executed.
 * @param {object} parameters The list or catalog of parameters that were passed to the procedure.
 * @returns {ProcedureContext} The new procedure context.
 */
function ProcedureContext(target, type, procedure, parameters) {
    this.target = target;
    this.type = type;
    this.procedure = procedure;
    this.parameters = parameters;
    this.instructions = null;  // TODO: pull from type definition
    this.instructionPointer = 1;  // points to next instruction using Bali unit based indexing
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;
exports.ProcedureContext = ProcedureContext;
