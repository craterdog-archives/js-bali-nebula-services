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
 * This class defines the context for a task that is being executed by the
 * the Bali Virtual Machine™.
 */


// machine states
exports.ACTIVE = 0;
exports.WAITING = 1;
exports.DONE = 2;


/**
 * This constructor creates a task context.
 * 
 * @constructor
 * @returns {TaskContext} The new task context.
 */
function TaskContext() {
    this.status = exports.ACTIVE;
    this.singleStep = false;
    this.componentStack = [];
    this.procedureStack = [];
    this.handlerStack = [];
    this.cycles = 0;
    return this;
}
TaskContext.prototype.constructor = TaskContext;
exports.TaskContext = TaskContext;


// define the missing stack function for Array
Array.prototype.peek = function() {
    return this[this.length - 1];
};
