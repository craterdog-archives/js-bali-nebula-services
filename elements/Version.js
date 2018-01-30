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


/**
 * This constructor creates a new version element.
 * 
 * @param {string} value The value of the version.
 * @returns {Symbol} The new version element.
 */
function Version(value) {
    this.value = value ? value : 'v1';  // default value
    if (!/^v([1-9][0-9]*)(\.[1-9][0-9]*)*$/g.test(this.value)) {
        throw new Error('VERSION: A version string must begin with "v" and contain at least one version and cannot contain white space: ' + this.value);
    }
    return this;
}
Version.prototype.constructor = Version;
exports.Version = Version;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {ObjectVisitor} visitor The visitor that wants to visit this element.
 */
Version.prototype.accept = function(visitor) {
    visitor.visitVersion(this);
};


/**
 * This method returns the version string.
 * 
 * @returns {string} The version string.
 */
Version.prototype.toString = function() {
    return this.value;
};
