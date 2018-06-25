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
 * text string element.
 */
var abstractions = require('../abstractions/');


/**
 * This constructor creates a new text string element.
 * 
 * @constructor
 * @param {string} value The value of the text string (embedded in double quotes).
 * @returns {Text} The new text string.
 */
function Text(value) {
    abstractions.Element.call(this);
    this.value = value || '""';  // default is the empty text string
    return this;
}
Text.prototype = Object.create(abstractions.Element.prototype);
Text.prototype.constructor = Text;
exports.Text = Text;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Text.prototype.accept = function(visitor) {
    visitor.visitText(this);
};


/**
 * This method compares two texts for ordering.
 * 
 * @param {Text} that The other text to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Text.prototype.comparedWith = function(that) {
    return this.value.localeCompare(that.value);
};


/**
 * This method returns the text string embedded in double quotes.
 * 
 * @returns {string} The text string embedded in double quotes.
 */
Text.prototype.toString = function() {
    return this.value;
};


/**
 * This method returns the raw javascript string.
 * 
 * @returns {string} The raw javascript string.
 */
Text.prototype.getRawString = function() {
    return this.value.slice(1, -1);  // strip off the double quotes
};
