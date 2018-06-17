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

/**
 * This collection class implements a stack (LIFO) data structure.  Attempting to access an
 * entity on an empty stack is considered a bug in the calling code and a runtime exception
 * is thrown.  The implementation dynamically scales up and down the size of the underlying
 * data structures as the number items changes over time.
 */
var Composite = require('./Composite').Composite;
var LinkedList = require('./LinkedList').LinkedList;


/**
 * The constructor for the Stack class takes an optional capacity.
 * 
 * @param {Number} optionalCapacity The maximum number of items that can be on the stack.
 */
function Stack(optionalCapacity) {
    Composite.call(this);
    this.capacity = optionalCapacity ? optionalCapacity : 1024;
    this.list = new LinkedList();
    return this;
}
Stack.prototype = Object.create(Composite.prototype);
Stack.prototype.constructor = Stack;
exports.Stack = Stack;


// PUBLIC METHODS

/**
/**
 * This method returns the number of items that are currently on the stack.
 * 
 * @returns {Number}
 */
Stack.prototype.getSize = function() {
    var size = this.list.getSize();
    return size;
};


/**
 * This method removes all items from the stack.
 */
Stack.prototype.removeAll = function() {
    this.list.removeAll();
};


/**
 * This method creates an iterator that can be used to traverse the stack
 * from bottom to top.
 * 
 * @returns {Iterator}
 */
Stack.prototype.iterator = function() {
    var iterator = this.list.iterator();
    return iterator;
};


/**
 * This method pushes a new item onto the top of the stack.
 *
 * @param {Object} item The new item to be added.
 */
Stack.prototype.pushItem = function(item) {
    if (this.list.getSize() < this.capacity) {
        this.list.addTail(item);
    } else {
        throw new Error("Attempted to push an item onto a full stack.");
    }
};


/**
 * This method pops the top item off of the stack.  If the stack is empty
 * an exception is thrown.
 *
 * @returns {Object} The top item from the stack.
 */
Stack.prototype.popItem = function() {
    var item;
    var size = this.list.getSize();
    if (size > 0) {
        item = this.list.removeTail();
    } else {
        throw new Error("Attempted to pop the top item of an empty stack.");
    }
    return item;
};


/**
 * This method returns a reference to the top item on the stack without
 * removing it from the stack.  If the stack is empty an exception is thrown.
 *
 * @returns {Object} The top item on the stack.
 */
Stack.prototype.getTop = function() {
    var item = null;
    var size = this.list.size();
    if (size > 0) {
        item = this.list.getTail();
    } else {
        throw new Error("Attempted to access the top item of an empty stack.");
    }
    return item;
};
