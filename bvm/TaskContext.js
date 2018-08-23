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
 * This constructor creates a task context.
 * 
 * @constructor
 * @param {Catalog} catalog The catalog containing the task context attributes. 
 * @returns {TaskContext} The new task context.
 */
function TaskContext(catalog) {
    if (catalog) {
        this.tag = catalog.getValue('$tag');
        this.status = catalog.getValue('$status');
        this.clock = catalog.getValue('$clock').toNumber();
        this.stepping = catalog.getValue('$stepping').toBoolean();
        this.components = catalog.getValue('$components');
        this.procedures = catalog.getValue('$procedures');
        this.handlers = catalog.getValue('$handlers');
    } else {
        this.tag = new elements.Tag();
        this.status = exports.ACTIVE;
        this.clock = 0;
        this.stepping = false;
        this.components = new collections.Stack();
        this.procedures = new collections.Stack();
        this.handlers = new collections.Stack();
    }
    return this;
}
TaskContext.prototype.constructor = TaskContext;
exports.TaskContext = TaskContext;


TaskContext.prototype.accept = function(visitor) {
    visitor.visitTaskContext(this);
};
