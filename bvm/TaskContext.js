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
 * This class defines the context for a task that is being executed by the
 * the Bali Virtual Machine™.
 */
var elements = require('../elements');
var collections = require('../collections');


// machine states
exports.ACTIVE = new elements.Symbol('$active');
exports.WAITING = new elements.Symbol('$waiting');
exports.DONE = new elements.Symbol('$done');


/**
 * This function creates a new task context.
 * 
 * @param {Tag} accountTag The unique tag for the account that initiated the task.
 * @param {Number} accountBalance The number of tokens that are in the account.
 * @returns {TaskContext} The new task context.
 */
exports.create = function(accountTag, accountBalance) {
    var context = new TaskContext();
    context.taskTag = new elements.Tag();
    context.accountTag = accountTag;
    context.accountBalance = accountBalance;
    context.status = exports.ACTIVE;
    context.clockCycles = 0;
    context.inStepMode = false;
    context.components = new collections.Stack();
    context.procedures = new collections.Stack();
    context.handlers = new collections.Stack();
    return context;
};


/**
 * This function creates a task context from an existing catalog of task attributes.
 * 
 * @param {Catalog} catalog The catalog containing the task context attributes. 
 * @returns {TaskContext} The corresponding task context.
 */
exports.fromCatalog = function(catalog) {
    var context = new TaskContext();
    context.taskTag = catalog.getValue('$taskTag');
    context.accountTag = catalog.getValue('$accountTag');
    context.accountBalance = catalog.getValue('$accountBalance');
    context.status = catalog.getValue('$status');
    context.clockCycles = catalog.getValue('$clockCycles').toNumber();
    context.inStepMode = catalog.getValue('$inStepMode').toBoolean();
    context.components = catalog.getValue('$components');
    context.procedures = catalog.getValue('$procedures');
    context.handlers = catalog.getValue('$handlers');
    return context;
};


function TaskContext() {
    return this;
}
TaskContext.prototype.constructor = TaskContext;


TaskContext.prototype.accept = function(visitor) {
    visitor.visitTaskContext(this);
};
