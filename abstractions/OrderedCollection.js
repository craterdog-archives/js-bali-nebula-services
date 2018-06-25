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
 * This abstract class defines the invariant methods that all ordered collections must inherit.
 * An ordered collection automatically orders its items based on the comparison function
 * implemented by a specified <code>Comparator</code>.  If no comparator is specified, the
 * a natural NaturalComparator is used. Duplicate items may be enabled as well, they are not
 * allowed by default.
 */
var Collection = require('./Collection').Collection;


/**
 * The constructor for the OrderedCollection class takes an argument telling or not
 * duplicate items are allowed in the collection.
 *
 * @param {Boolean} duplicatesAllowed Whether or not duplicate items are allowed.
 * 
 * @returns {OrderedCollection} The new sortable collection.
 */
function OrderedCollection(duplicatesAllowed) {
    Collection.call(this);
    this.duplicatesAllowed = duplicatesAllowed ? duplicatesAllowed : false;
    return this;
}
OrderedCollection.prototype = Object.create(Collection.prototype);
OrderedCollection.prototype.constructor = OrderedCollection;
exports.OrderedCollection = OrderedCollection;
