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
 * percent element.
 */
var abstractions = require('../abstractions/');


/**
 * This constructor creates a new percent element.
 * 
 * @param {number|string} value The value of the percent.
 * @returns {Percent} The new percent element.
 */
function Percent(value) {
    abstractions.Element.call(this);
    var type = typeof value;
    switch (type) {
        case 'undefined':
            this.value = 0;
            break;
        case 'number':
            this.value = value;
            break;
        case 'string':
            this.value = Number(value.replace(/%/g, ''));  // strip off the %
            break;
        default:
            throw new Error('PERCENT: An invalid value type was passed into the constructor: ' + type);
    }
    return this;
}
Percent.prototype = Object.create(abstractions.Element.prototype);
Percent.prototype.constructor = Percent;
exports.Percent = Percent;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Percent.prototype.accept = function(visitor) {
    visitor.visitPercent(this);
};


/**
 * This method compares two percents for ordering.
 * 
 * @param {Percent} that The other percent to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Percent.prototype.comparedWith = function(that) {
    if (this.value < that.value) return -1;
    if (this.value > that.value) return 1;
    return 0;
};


/**
 * This method returns a string representation of the percent element.
 * 
 * @returns {string} The string representation of the percent element.
 */
Percent.prototype.toString = function () {
    return this.value.toString() + '%';  // append the %
};


/**
 * This method returns the numeric value of the percent element, e.g. 25% => 0.25
 * 
 * @returns {number} The numeric value of the percent element.
 */
Percent.prototype.toNumber = function () {
    return this.value / 100;
};
