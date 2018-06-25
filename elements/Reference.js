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
 * This element class captures the state and methods associated with a
 * reference element.
 */
var abstractions = require('../abstractions/');
var URL = require('url').URL;


/**
 * This constructor creates a new reference element.
 * 
 * @param {string} value The value of the reference.
 * @returns {Reference} The new reference element.
 */
function Reference(value) {
    abstractions.Element.call(this);
    if (!value) throw new Error('REFERENCE: An invalid value was passed to the constructor: ' + value);
    value = value.slice(1, -1);  // remove the angle brackets
    this.value = new URL(value);
    return this;
}
Reference.prototype = Object.create(abstractions.Element.prototype);
Reference.prototype.constructor = Reference;
exports.Reference = Reference;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Reference.prototype.accept = function(visitor) {
    visitor.visitReference(this);
};


/**
 * This method compares two references for ordering.
 * 
 * @param {Reference} that The other reference to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Reference.prototype.comparedWith = function(that) {
    return this.value.toString().localeCompare(that.value.toString());
};


/**
 * This method returns a string representation of the reference element.
 * 
 * @returns {string} The string representation of the reference element.
 */
Reference.prototype.toString = function() {
    return '<' + this.value + '>';  // embed in angle brackets
};
