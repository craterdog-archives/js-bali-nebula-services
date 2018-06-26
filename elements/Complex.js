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
 * complex number element.
 */
var abstractions = require('../abstractions/');
var antlr = require('antlr4');
var grammar = require('bali-language/grammar');
var Angle = require('./Angle').Angle;
/* global NaN, Infinity */


/**
 * This constructor creates an immutable instance of a complex number element.
 * The allowed ways to call it include:
 * <pre><code>
 * new Complex()
 * new Complex(realPart, imaginaryPart)
 * new Complex(magnitude, angle)
 * new Complex('(3, 4i)')  // rectangular form
 * new Complex('(12.3e-45 e^3.1415926i)')  // polar form
 * </code></pre>
 * 
 * @constructor
 * @param {number|string} numberOrString
 * @param {number|Angle} optionalNumberOrAngle
 * @returns {Complex}
 */
function Complex(numberOrString, optionalNumberOrAngle) {
    abstractions.Element.call(this);
    this.format = 'rectangular';  // rectangular coordinates by default
    var number;
    var real;
    var imaginary;

    if (typeof numberOrString === 'undefined' || numberOrString === null) {
        // Complex(): constructor generates the default complex value of zero
        numberOrString = 0;
    }

    if (typeof numberOrString === 'number' && !optionalNumberOrAngle) {
        // Complex(real): constructor generates a complex number with only a real part
        number = numberOrString;
        if (isNaN(number)) {
            this.real = NaN;
            this.imaginary = NaN;
            this.magnitude = NaN;
            this.angle = new Angle(0);
        } else if (isZero(number)) {  // handles -0 too
            this.real = 0;
            this.imaginary = 0;
            this.magnitude = 0;
            this.angle = new Angle(0);
        } else if (isInfinite(number)) {
            this.real = Infinity;
            this.imaginary = Infinity;
            this.magnitude = Infinity;
            this.angle = new Angle(0);
        } else {
            this.real = number;
            this.imaginary = 0;
        }

    } else if (typeof numberOrString === 'string' && !optionalNumberOrAngle) {
        // Complex(string): constructor generates a complex number from a string
        var string = numberOrString;
        var chars = new antlr.InputStream(string);
        var lexer = new grammar.BaliLanguageLexer(chars);
        var tokens = new antlr.CommonTokenStream(lexer);
        var parser = new grammar.BaliLanguageParser(tokens);
        parser.buildParseTrees = true;
        number = parser.number();
        var nodeType = number.constructor.name;
        switch (nodeType) {
            case 'UndefinedNumberContext':
                this.real = NaN;
                this.imaginary = NaN;
                this.magnitude = NaN;
                this.angle = new Angle(0);
                break;
            case 'InfiniteNumberContext':
                this.real = Infinity;
                this.imaginary = Infinity;
                this.magnitude = Infinity;
                this.angle = new Angle(0);
                break;
            case 'RealNumberContext':
                real = number.real();
                this.real = realToNumber(real);
                this.imaginary = 0;
                break;
            case 'ImaginaryNumberContext':
                imaginary = number.imaginary();
                this.real = 0;
                this.imaginary = imaginaryToNumber(imaginary);
                break;
            case 'ComplexNumberContext':
                real = number.real();
                imaginary = number.imaginary();
                var delimiter = number.del.text;
                if (delimiter === ',') {
                    this.real = realToNumber(real);
                    this.imaginary = imaginaryToNumber(imaginary);
                } else {
                    this.format = 'polar';
                    this.magnitude = realToNumber(real);
                    this.angle = new Angle(imaginaryToNumber(imaginary));
                    this.normalize();
                }
                break;
            default:
                throw new Error('COMPLEX: An invalid string was passed to the constructor : ' + string);
        }
    } else if (typeof numberOrString === 'number' && typeof optionalNumberOrAngle === 'number') {
        // Complex(real, imaginary): constructor generates a complex number with a real part and imaginary part
        real = numberOrString;
        imaginary = optionalNumberOrAngle;
        if (isNaN(real) || isNaN(imaginary)) return Complex.UNDEFINED;
        if (isZero(real) && isZero(imaginary)) return Complex.ZERO;
        if (isInfinite(real) || isInfinite(imaginary)) return Complex.INFINITY;
        this.real = real;
        this.imaginary = imaginary;
    } else if (typeof numberOrString === 'number' && optionalNumberOrAngle && optionalNumberOrAngle.constructor.name === 'Angle') {
        // Complex(magnitude, angle): constructor generates a complex number with a magnitude and angle
        this.format = 'polar';
        var magnitude = numberOrString;
        var angle = optionalNumberOrAngle;
        if (isNaN(magnitude)) return Complex.UNDEFINED;
        if (isZero(magnitude)) return Complex.ZERO;
        if (isInfinite(magnitude)) return Complex.INFINITY;
        this.magnitude = magnitude;
        this.angle = angle;
        this.normalize();
    } else {
        throw new Error('COMPLEX: An invalid value was passed to the constructor: ' + numberOrString + ', ' + optionalNumberOrAngle);
    }

    if (this.isUndefined() && typeof Complex.UNDEFINED !== 'undefined') return Complex.UNDEFINED;
    if (this.isZero() && typeof Complex.ZERO !== 'undefined') return Complex.ZERO;
    if (this.isInfinite() && typeof Complex.INFINITY !== 'undefined') return Complex.INFINITY;
    return this;
}
Complex.prototype = Object.create(abstractions.Element.prototype);
Complex.prototype.constructor = Complex;
exports.Complex = Complex;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Complex.prototype.accept = function(visitor) {
    visitor.visitNumber(this);
};


/**
 * This method normalizes the magnitude and angle if the complex number is in polar form.
 */
Complex.prototype.normalize = function() {
    if (this.format === 'polar') {
        if (this.magnitude < 0) {
            this.magnitude = -this.magnitude;
            this.angle = Angle.inverse(this.angle);
        }
    }
};


/**
 * This method determines whether the complex number is undefined.
 * 
 * @returns {boolean}
 */
Complex.prototype.isUndefined = function() {
    return this.getMagnitude().toString() === 'NaN';  // must use strings since NaN !== NaN
};


/**
 * This method determines whether the complex number is zero.
 * 
 * @returns {boolean}
 */
Complex.prototype.isZero = function() {
    return this.getMagnitude() === 0;
};


/**
 * This method determines whether the complex number is infinite.
 * 
 * @returns {boolean}
 */
Complex.prototype.isInfinite = function() {
    return this.getMagnitude() === Infinity;
};


/**
 * This method returns the real part of the complex number.
 * 
 * @returns {number}
 */
Complex.prototype.getRealPart = function() {
    if (typeof this.real === 'undefined') {
        this.real = lockOnPole(this.magnitude * Angle.cosine(this.angle));
    }
    return this.real;
};


/**
 * This method returns the imaginary part of the complex number.
 * 
 * @returns {number}
 */
Complex.prototype.getImaginaryPart = function() {
    if (typeof this.imaginary === 'undefined') {
        this.imaginary = lockOnPole(this.magnitude * Angle.sine(this.angle));
    }
    return this.imaginary;
};


/**
 * This method returns the magnitude of the complex number.
 * 
 * @returns {number}
 */
Complex.prototype.getMagnitude = function() {
    if (typeof this.magnitude === 'undefined') {
        this.magnitude = Math.sqrt(Math.pow(this.real, 2) + Math.pow(this.imaginary, 2));
    }
    return this.magnitude;
};


/**
 * This method returns the angel of the complex number.
 * 
 * @returns {Angle}
 */
Complex.prototype.getAngle = function() {
    if (typeof this.angle === 'undefined') {
        var angle = Angle.arctangent(this.imaginary, this.real).toNumber();
        angle = lockOnPole(angle);
        this.angle = new Angle(angle);
    }
    return this.angle;
};


/**
 * This method compares two complex numbers for ordering.
 * 
 * @param {Complex} that The other complex number to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Complex.prototype.comparedWith = function(that) {
    if (this.real < that.real) return -1;
    if (this.real > that.real) return 1;
    // the real parts are equal, check the imaginary parts
    if (this.imaginary < that.imaginary) return -1;
    if (this.imaginary > that.imaginary) return 1;
    // they are also equal
    return 0;
};


/**
 * This method returns a string version of the complex number.
 * 
 * @returns {string}
 */
Complex.prototype.toString = function() {
    if (this.format === 'rectangular') {
        return this.toRectangular();
    } else {
        return this.toPolar();
    }
};


/**
 * This method returns a string version of the complex number in retangular form.
 * 
 * @returns {string}
 */
Complex.prototype.toRectangular = function() {
    if (this.isUndefined()) return 'undefined';
    if (this.isZero()) return '0';
    if (this.isInfinite()) return 'infinity';
    if (this.getRealPart() === 0) return imaginaryToString(this.getImaginaryPart());
    if (this.getImaginaryPart() === 0) return realToString(this.getRealPart());
    var string = '(';
    string += realToString(this.getRealPart());
    string += ', ';
    string += imaginaryToString(this.getImaginaryPart());
    string += ')';
    return string;
};


/**
 * This method returns a string version of the complex number in polar form.
 * 
 * @returns {string}
 */
Complex.prototype.toPolar = function() {
    if (this.isUndefined()) return 'undefined';
    if (this.isZero()) return '0';
    if (this.isInfinite()) return 'infinity';
    if (this.getAngle() === Angle.ZERO) return realToString(this.getRealPart());
    var string = '(';
    string += realToString(this.getMagnitude());
    string += ' e^';
    string += imaginaryToString(this.getAngle());
    string += ')';
    return string;
};


/**
 * This method returns the real part of the complex number.
 * 
 * @returns {number}
 */
Complex.prototype.toNumber = function() {
    return this.getRealPart();
};


Complex.UNDEFINED = new Complex(NaN);
Complex.ZERO = new Complex(0);
Complex.INFINITY = new Complex(Infinity);


function lockOnPole(number) {
    if (number > 0 && number <= 6.123233995736766e-16) return 0;
    if (number < 0 && number >= -6.123233995736766e-16) return 0;
    if (number > 0 && number >= 16331239353195370) return Infinity;
    if (number < 0 && number <= -16331239353195370) return Infinity;
    return number;
}


function isZero(number) {
    return number === 0;  // handles -0 too since -0 === 0
}


function isInfinite(number) {
    return !(isFinite(number) || isNaN(number));
}


/**
 * This function returns the Bali string representation of a real number.
 * 
 * @param {number} real The real number.
 * @returns {string} The Bali string for that number.
 */
function realToString(real) {
    var string = real.toString();
    switch (string) {
        case '-2.718281828459045':
            string = '-e';
            break;
        case '2.718281828459045':
            string = 'e';
            break;
        case '-3.141592653589793':
            string = '-pi';
            break;
        case '3.141592653589793':
            string = 'pi';
            break;
        case '-1.618033988749895':
            string = '-phi';
            break;
        case '1.618033988749895':
            string = 'phi';
            break;
        case 'Infinity':
        case '-Infinity':
            string = 'infinity';
            break;
        case 'NaN':
            string = 'undefined';
            break;
        default:
            // must replace the 'e' in the JS exponent with 'E' for the Bali exponent
            string = string.replace(/e\+?/g, 'E');
    }
    return string;
}


/**
 * This function returns the Bali string representation of an imaginary number.
 * 
 * @param {number} imaginary The imaginary number.
 * @returns {string} The Bali string for that number.
 */
function imaginaryToString(imaginary) {
    var string = realToString(imaginary);
    switch (string) {
        case '-1':
            string = '-i';
            break;
        case '1':
            string = 'i';
            break;
        case '-e':
        case 'e':
        case '-pi':
        case 'pi':
        case '-phi':
        case 'phi':
            string += ' i';
            break;
        case 'infinity':
        case 'undefined':
            break;
        default:
            string += 'i';
    }
    return string;
}


function realToNumber(baliReal) {
    var jsNumber;
    if (baliReal.constructor.name === 'ConstantRealContext') {
        var constant = baliReal.CONSTANT().getText();
        switch (constant) {
            case 'e':
                jsNumber = 2.718281828459045;
                break;
            case 'pi':
                jsNumber = 3.141592653589793;
                break;
            case 'phi':
                jsNumber = 1.618033988749895;
                break;
        }
        if (baliReal.sign) {
            jsNumber = -jsNumber;
        }
        return jsNumber;
    } else {
        var string = baliReal.FLOAT().getText();
        jsNumber = Number(string);
        return jsNumber;
    }
}


function imaginaryToNumber(baliImaginary) {
    var real = baliImaginary.real();
    var sign = baliImaginary.sign;
    var jsNumber = 1;
    if (real) {
        jsNumber = realToNumber(real);
    } else if (sign) {
        jsNumber = -jsNumber;
    }
    return jsNumber;
}

