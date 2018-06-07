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
 * This library provides functions that analyze a Bali Type Document in
 * preparation for compilation.
 */


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure for a Bali type
 * analyzing it for correctness and filling in missing type information.
 * The function returns the context information that will be needed
 * by the compiler.
 * 
 * @param {TreeNode} tree The parse tree structure for the Bali type.
 * @returns {object} An object containing the type context information.
 */
exports.analyzeType = function(tree) {
    var context = {};
    //TODO: do the actual analysis
    return context;
};
