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
 * This class captures the state and methods associated with an angle.
 */
var abstractions = require('../abstractions/');


/**
 * This constructor creates an immutable instance of an angle in radians.
 * 
 * @constructor
 * @param {number|string} value
 * @returns {Angle}
 */
function Angle(value) {
    abstractions.Element.call(this);
    if (typeof value === 'undefined' || value === null) value = 0;  // default value
    var type = typeof value;
    switch (type) {
        case 'number':
            if (!isFinite(value)) throw new Error('ANGLE: An angle must be a valid number: ' + value);
            break;
        case 'string':
            if (value === 'pi' || value === '-pi') {
                value = Math.PI;
            } else {
                value = Number(value);
            }
            break;
        default:
            throw new Error('ANGLE: An invalid value type was passed to the constructor: ' + type);
    }
    var twoPi = 2 * Math.PI;
    if (value <= -Math.PI || value > Math.PI) value %= twoPi;  // make in range (-2pi..2pi)
    if (value > Math.PI) value -= twoPi;  // make in the range (-pi..pi]
    if (value <= -Math.PI) value += twoPi;  // make in the range (-pi..pi]
    if (value === -0) value = 0;  // normalize to positive zero
    if (typeof Angle.ZERO !== 'undefined' && value === 0) return Angle.ZERO;
    if (typeof Angle.PI !== 'undefined' && value === Math.PI) return Angle.PI;
    this.value = value;
    return this;
}
Angle.prototype = Object.create(abstractions.Element.prototype);
Angle.prototype.constructor = Angle;
exports.Angle = Angle;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {ObjectVisitor} visitor The visitor that wants to visit this element.
 */
Angle.prototype.accept = function(visitor) {
    visitor.visitAngle(this);
};


/**
 * This method returns a string version of the angle.
 * 
 * @returns {string}
 */
Angle.prototype.toString = function() {
    return this.value.toString();
};


/**
 * This method compares two angles for ordering.
 * 
 * @param {Angle} that The other angle to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Angle.prototype.comparedWith = function(that) {
    if (this.value < that.value) return -1;
    if (this.value > that.value) return 1;
    return 0;
};


/**
 * This method returns the numeric value of the angle.
 * 
 * @returns {number}
 */
Angle.prototype.toNumber = function() {
    return this.value;
};


// common constants
Angle.ZERO = new Angle(0);
Angle.PI = new Angle(Math.PI);


/**
 * This function returns the inverse of an angle.
 * 
 * @param {Angle} angle
 * @returns {Angle}
 */
Angle.inverse = function(angle) {
    var value = angle.value - Math.PI;
    if (value <= -Math.PI || value > Math.PI) value %= Math.PI;
    return new Angle(value);
};


/**
 * This function returns the sine (opposite/hypotenuse) of an angle.
 * 
 * @param {Angle} angle
 * @returns {number}
 */
Angle.sine = function(angle) {
    return Math.sin(angle.value);
};


/**
 * This function returns the cosine (adjacent/hypotenuse) of an angle.
 * 
 * @param {Angle} angle
 * @returns {number}
 */
Angle.cosine = function(angle) {
    return Math.cos(angle.value);
};


/**
 * This function returns an angle that is the arctangent of y/x.
 * 
 * @param {number} ratioOrY
 * @param {number} optionalX
 * @returns {Angle}
 */
Angle.arctangent = function(ratioOrY, optionalX) {
    var angle;
    if (typeof optionalX !== 'undefined' && optionalX !== null) {
        var y = ratioOrY;
        var x = optionalX;
        angle = Math.atan2(y, x);
        angle = new Angle(angle);
    } else {
        var ratio = ratioOrY;
        angle = new Angle(Math.atan(ratio));
    }
    return angle;
};
