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
 * version element.
 */
var abstractions = require('../abstractions/');


/**
 * This constructor creates a new version element.
 * 
 * @param {String} value The value of the version.
 * @returns {Symbol} The new version element.
 */
function Version(value) {
    abstractions.Element.call(this);
    this.value = value ? value : 'v1';  // default value
    if (!/^v([1-9][0-9]*)(\.[1-9][0-9]*)*$/g.test(this.value)) {
        throw new Error('VERSION: A version string must begin with "v" and contain at least one version and cannot contain white space: ' + this.value);
    }
    return this;
}
Version.prototype = Object.create(abstractions.Element.prototype);
Version.prototype.constructor = Version;
exports.Version = Version;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Version.prototype.accept = function(visitor) {
    visitor.visitVersion(this);
};


/**
 * This method compares two versions for ordering.
 * 
 * @param {Version} that The other version to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Version.prototype.comparedWith = function(that) {
    var thisNumbers = this.getNumbers();
    var thatNumbers = that.getNumbers();
    var index = 0;
    while (index < thisNumbers.length && index < thatNumbers.length) {
        if (thisNumbers[index] < thatNumbers[index]) return -1;
        if (thisNumbers[index] > thatNumbers[index]) return 1;
        index++;
    }
    // so far they are the same...
    if (thisNumbers.length < thatNumbers.length) return -1;
    if (thisNumbers.length > thatNumbers.length) return 1;
    // they are exactly the same version numbers
    return 0;
};


/**
 * This method returns the version string.
 * 
 * @returns {String} The version string.
 */
Version.prototype.toString = function() {
    return this.value;
};


/**
 * This method returns the version numbers in an array.
 * 
 * @returns {Array} The version numbers.
 */
Version.prototype.getNumbers = function() {
    var numbers = [];
    var tokens = this.value.slice(1).split('.');
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        numbers.push(Number(token));
    }
    return numbers;
};
