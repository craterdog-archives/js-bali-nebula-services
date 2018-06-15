/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM). All Rights Reserved.    *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.       *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative.(See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

/**
 * This library encapsulates the intrinsic functions supported by the Bali
 * Virtual Machine™.
 */


// PUBLIC FUNCTIONS

exports.intrinsicFunctions = [
    // addItem
    function(list, item) {},

    // and
    function(firstProbability, secondProbability) {},

    // catalog
    function(size) {},

    // complement
    function(probability) {},

    // conjugate
    function(number) {},

    // default
    function(useProposed, proposedValue, defaultValue) {
        return useProposed ? proposedValue : defaultValue;
    },

    // difference
    function(firstNumber, secondNumber) {},

    // equal
    function(firstValue, secondValue) {},

    // exponential
    function(firstNumber, secondNumber) {},

    // factorial
    function(number) {},

    // getValue
    function(catalog, key) {},

    // inverse
    function(number) {},

    // is
    function(firstValue, secondValue) {},

    // less
    function(firstNumber, secondNumber) {},

    // list
    function(size) {},

    // magnitude
    function(number) {},

    // matches
    function(value, template) {},

    // more
    function(firstNumber, secondNumber) {},

    // negative
    function(number) {},

    // or
    function(firstProbability, secondProbability) {},

    // product
    function(firstNumber, secondNumber) {},

    // quotient
    function(firstNumber, secondNumber) {},

    // range
    function(firstValue, lastValue) {},

    // remainder
    function(firstNumber, secondNumber) {},

    // sans
    function(firstProbability, secondProbability) {},

    // setParameters
    function(object, parameters) {},

    // setValue
    function(catalog, key, value) {},

    // sum
    function(firstNumber, secondNumber) {},

    // xor
    function(firstProbability, secondProbability) {}
];

exports.intrinsicNames = [
    '$addItem',
    '$and',
    '$catalog',
    '$complement',
    '$conjugate',
    '$default',
    '$difference',
    '$equal',
    '$exponential',
    '$factorial',
    '$getValue',
    '$inverse',
    '$is',
    '$less',
    '$list',
    '$magnitude',
    '$matches',
    '$more',
    '$negative',
    '$or',
    '$product',
    '$quotient',
    '$range',
    '$remainder',
    '$sans',
    '$setParameters',
    '$setValue',
    '$sum',
    '$xor'
];