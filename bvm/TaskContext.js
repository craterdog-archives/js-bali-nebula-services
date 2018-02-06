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
//var grammar = require('../grammar');


/**
 * This constructor creates a task context.
 * 
 * @constructor
 * @returns {TaskContext} The new task context.
 */
function TaskContext() {
    this.status = RUNNING;
    this.executionStack = [];
    this.contextStack = [];
    return this;
}
TaskContext.prototype.constructor = TaskContext;
exports.TaskContext = TaskContext;


// define the missing stack function for Array
Array.prototype.peek = function() {
    return this[this.length - 1];
};


// machine states
var STEPPING = 0;
var RUNNING = 1;
var WAITING = 2;
var DONE = 3;


/**
 * This method marks this task as single stepping.
 */
TaskContext.prototype.step = function() {
    this.status = STEPPING;
};


/**
 * This method returns whether or not this task is currently single stepping.
 * 
 * @returns {boolean} Whether or not this task is currently single stepping.
 */
TaskContext.prototype.isStepping = function() {
    return this.status === STEPPING;
};


/**
 * This method marks this task as running.
 */
TaskContext.prototype.run = function() {
    this.status = RUNNING;
};


/**
 * This method returns whether or not this task is currently running.
 * 
 * @returns {boolean} Whether or not this task is currently running.
 */
TaskContext.prototype.isRunning = function() {
    return this.status === RUNNING;
};


/**
 * This method marks this task as paused waiting for an event.
 */
TaskContext.prototype.wait = function() {
    this.status = WAITING;
};


/**
 * This method returns whether or not this task is currently waiting for an event.
 * 
 * @returns {boolean} Whether or not this task is currently waiting for an event.
 */
TaskContext.prototype.isWaiting = function() {
    return this.status === WAITING;
};


/**
 * This method marks this task as being done.
 */
TaskContext.prototype.done = function() {
    this.status = DONE;
};


/**
 * This method returns whether or not this task is done.
 * 
 * @returns {boolean} Whether or not this task is done.
 */
TaskContext.prototype.isDone = function() {
    return this.status === DONE;
};


/**
 * This method returns the Bali component that is currently on top of the component
 * stack, or <code>null</code> if the stack is empty.
 * 
 * @returns {object} The Bali component that is currently on top of the execution stack.
 */
TaskContext.prototype.topComponent = function() {
    return this.executionStack.peek();
};


/**
 * This method pushes a Bali component onto the top of the execution stack.
 * 
 * @param {object} component The Bali component to be pushed onto the execution stack.
 */
TaskContext.prototype.pushComponent = function(component) {
    this.executionStack.push(component);
};


/**
 * This method removes from the execution stack the Bali component that
 * is currently on top of the execution stack.
 * 
 * @returns {object} The Bali component that was on top of the execution stack.
 */
TaskContext.prototype.popComponent = function() {
    return this.executionStack.pop();
};


/**
 * This method returns the Bali context that is currently on top of the stack,
 * or <code>null</code> if the stack is empty.
 * 
 * @returns {object} The Bali context that is currently on top of the context stack.
 */
TaskContext.prototype.currentContext = function() {
    return this.contextStack.peek();
};


/**
 * This method pushes a Bali context onto the top of the context stack.
 * 
 * @param {object} context The Bali context to be pushed onto the context stack.
 */
TaskContext.prototype.pushContext = function(context) {
    this.contextStack.push(context);
};


/**
 * This method removes the context that is currently on top of the context stack.
 * 
 * @returns {object} The context that was on top of the context stack.
 */
TaskContext.prototype.popContext = function() {
    return this.contextStack.pop();
};
