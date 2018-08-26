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
 * @param {ProcedureContext} procedureContext The initial procedure context for the task.
 * @returns {TaskContext} The new task context.
 */
exports.create = function(accountTag, accountBalance, procedureContext) {
    var taskContext = new TaskContext();
    taskContext.taskTag = new elements.Tag();
    taskContext.accountTag = accountTag;
    taskContext.accountBalance = accountBalance;
    taskContext.processorStatus = exports.ACTIVE;
    taskContext.clockCycles = 0;
    taskContext.breakPoints = undefined;
    taskContext.componentStack = new collections.Stack();
    taskContext.procedureStack = new collections.Stack();
    taskContext.handlerStack = new collections.Stack();
    taskContext.procedureStack.pushItem(procedureContext);
    return taskContext;
};


/**
 * This function creates a task context from an existing catalog of task attributes.
 * 
 * @param {Catalog} catalog The catalog containing the task context attributes. 
 * @returns {TaskContext} The corresponding task context.
 */
exports.fromCatalog = function(catalog) {
    var taskContext = new TaskContext();
    taskContext.taskTag = catalog.getValue('$taskTag');
    taskContext.accountTag = catalog.getValue('$accountTag');
    taskContext.accountBalance = catalog.getValue('$accountBalance');
    taskContext.processorStatus = catalog.getValue('$processorStatus');
    taskContext.clockCycles = catalog.getValue('$clockCycles').toNumber();
    taskContext.breakPoints = catalog.getValue('$breakPoints');
    taskContext.componentStack = catalog.getValue('$componentStack');
    taskContext.procedureStack = catalog.getValue('$procedureStack');
    taskContext.handlerStack = catalog.getValue('$handlerStack');
    return taskContext;
};


function TaskContext() {
    return this;
}
TaskContext.prototype.constructor = TaskContext;


TaskContext.prototype.accept = function(visitor) {
    visitor.visitTaskContext(this);
};
