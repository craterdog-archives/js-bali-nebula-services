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
 * This class defines a Bali type analzyer that analyzes a Bali type definition
 * extracting a set of symbol catalogs for all variables, procedures, labels, etc.
 */


/**
 * This constructor creates a new analyzer.
 * 
 * @constructor
 * @returns {LanguageAnalyzer} The new analyzer.
 */
function LanguageAnalyzer() {
    this.symbols = {
        '$types': {},
        '$literals': {},
        '$variables': {},
        '$references': {},
        '$intrinsics': {},
        '$procedures': {},
        '$addresses': {}
    };
    return this;
}
LanguageAnalyzer.prototype.constructor = LanguageAnalyzer;
exports.LanguageAnalyzer = LanguageAnalyzer;


/**
 * This function takes a Bali type definition and extracts from it a set of symbol catalogs for
 * all identifiers used in the type definition.
 * 
 * @param {object} baliTypeReference A reference to the Bali type definition to be analyzed. 
 * @returns {object} The resulting symbol catalogs for variables, procedures, labels, etc.
 */
LanguageAnalyzer.prototype.analyzeType = function(baliTypeReference) {
};
