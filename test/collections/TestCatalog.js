/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var collections = require('../../collections/');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test the catalog constructors.', function() {

        it('should create a catalog with no associations in it', function() {
            var catalog = new collections.Catalog();
            expect(catalog).to.exist;  // jshint ignore:line
            var size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
            var iterator = catalog.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === false);
            catalog.removeAll();
            var copy = catalog.emptyCopy();
            expect(copy).to.exist;  // jshint ignore:line
            expect(catalog.equalTo(copy)).to.equal(true);
            var signum = catalog.compareTo(copy);
            expect(signum).to.equal(0);
        });

        it('should create a catalog with initial associations in it', function() {
            var catalog = new collections.Catalog(seeds);
            var size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            catalog = new collections.Catalog(catalog);
            size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            var iterator = catalog.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            catalog.removeAll();
            size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

    });

    describe('Test the catalog methods.', function() {

        it('should be able to call the Collection class methods on the catalog', function() {
            var catalog1 = new collections.Catalog();
            catalog1.addItem(new collections.Association(key1, value1));
            catalog1.addItem(new collections.Association(key2, value2));
            catalog1.addItem(new collections.Association(key3, value3));
            var catalog2 = new collections.Catalog();
            catalog2.addItem(new collections.Association(key4, value4));
            catalog2.addItem(new collections.Association(key5, value5));
            catalog1.addItems(catalog2);
            size = catalog1.getSize();
            expect(size).to.equal(5);
            expect(catalog1.containsAll(catalog2)).to.equal(true);
            expect(catalog2.containsAll(catalog1)).to.equal(false);
            expect(catalog2.containsAny(catalog1)).to.equal(true);
            var catalog3 = catalog1.getItems(2, 4);
            size = catalog3.getSize();
            expect(size).to.equal(3);
            expect(catalog3.containsItem(association4)).to.equal(true);
            expect(catalog3.containsItem(association1)).to.equal(false);
            expect(catalog3.getIndex(association3)).to.equal(2);
            catalog2.addItems(catalog1);
            size = catalog2.getSize();
            expect(size).to.equal(5);
            expect(catalog2.containsAll(catalog1)).to.equal(true);
            catalog2.removeItems(catalog3);
            size = catalog2.getSize();
            expect(size).to.equal(2);
            expect(catalog2.containsItem(association3)).to.equal(false);
        });

        it('should be able to add and remove associations from a catalog', function() {
            var list = new collections.List(seeds);
            var catalog = new collections.Catalog(list);
            var size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(seeds.length);
            expect(catalog.getItem(2).value).to.equal(association2.value);
            expect(catalog.getIndex(association1)).to.equal(1);
            expect(catalog.getItem(5).value).to.equal(association5.value);
            expect(catalog.getIndex(association3)).to.equal(3);
            var actual = catalog.getValue(key3);
            expect(value3.equalTo(actual)).to.equal(true);
            var keys = catalog.getKeys();
            size = keys.getSize();
            expect(size).to.equal(seeds.length);
            var keyIterator = keys.iterator();
            expect(keyIterator).to.exist;  // jshint ignore:line
            var values = catalog.getValues();
            size = values.getSize();
            expect(size).to.equal(seeds.length);
            var valueIterator = values.iterator();
            expect(valueIterator).to.exist;  // jshint ignore:line
            var associations = catalog.getAssociations();
            size = associations.getSize();
            expect(size).to.equal(seeds.length);
            expect(list.equalTo(associations)).to.equal(true);
            var associationIterator = catalog.iterator();
            expect(associationIterator).to.exist;  // jshint ignore:line
            var key;
            var value;
            var association;
            var count = 0;
            while (keyIterator.hasNext() && valueIterator.hasNext() && associationIterator.hasNext()) {
                count++;
                key = keyIterator.getNext();
                value = valueIterator.getNext();
                association = associationIterator.getNext();
                expect(key.value).to.equal(count);
                expect(value.value).to.equal(count);
                expect(association.key.value).to.equal(count);
                expect(association.value.value).to.equal(count);
            }
            catalog.removeItem(association2);
            catalog.removeValue(key1);
            size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(3);
            associationIterator.toStart();
            value = 2;
            while (associationIterator.hasNext()) {
                value++;
                association = associationIterator.getNext();
                expect(association.value.value).to.equal(value);
            }
            catalog.setValue(key1, value5);
            expect(catalog.getValue(key1).equalTo(value5)).to.equal(true);
            catalog.setValue(key6, value6);
            expect(catalog.getValue(key6).equalTo(value6)).to.equal(true);
            catalog.removeAll();
            expect(catalog.getValue(key6)).to.equal(undefined);
            size = catalog.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

        it('should be able to perform catalog operations on catalogs', function() {
            var catalog1 = new collections.Catalog();
            catalog1.addItem(association1);
            catalog1.addItem(association2);
            catalog1.addItem(association3);
            var catalog2 = new collections.Catalog();
            catalog2.addItem(association4);
            catalog2.addItem(association5);
            var catalog3 = new collections.Catalog(seeds);
            expect(collections.Catalog.concatenation(catalog1, catalog2).equalTo(catalog3)).to.equal(true);
        });

    });

    describe('Test the catalog iterators.', function() {

        it('should iterate over a catalog forwards and backwards', function() {
            var catalog = new collections.Catalog(seeds);
            var iterator = catalog.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            iterator.toEnd();
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === true);
            var association;
            while (iterator.hasPrevious()) {
                association = iterator.getPrevious();
            }
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            association = iterator.getNext();
            expect(association.value.value).to.equal(1);
            association = iterator.getNext();
            expect(association.value.value).to.equal(2);
            association = iterator.getPrevious();
            expect(association.value.value).to.equal(2);
            association = iterator.getPrevious();
            expect(association.value.value).to.equal(1);
            while (iterator.hasNext()) {
                association = iterator.getNext();
            }
            iterator.toStart();
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
        });

    });

});


function Key(value) {
    this.value = value;
    return this;
}
Key.prototype.constructor = Key;

Key.prototype.equalTo = function(that) {
    return this.value === that.value;
};

Key.prototype.compareTo = function(that) {
    if (this.value < that.value) return -1;
    if (this.value === that.value) return 0;
    if (this.value > that.value) return 1;
};

Key.prototype.toString = function() {
    return this.value.toString();
};

var key1 = new Key(1);
var key2 = new Key(2);
var key3 = new Key(3);
var key4 = new Key(4);
var key5 = new Key(5);
var key6 = new Key(6);


function Value(value) {
    this.value = value;
    return this;
}
Value.prototype.constructor = Value;

Value.prototype.equalTo = function(that) {
    return this.value === that.value;
};

Value.prototype.compareTo = function(that) {
    if (this.value < that.value) return -1;
    if (this.value === that.value) return 0;
    if (this.value > that.value) return 1;
};

var value1 = new Value(1);
var value2 = new Value(2);
var value3 = new Value(3);
var value4 = new Value(4);
var value5 = new Value(5);
var value6 = new Value(6);


var association1 = new collections.Association(key1, value1);
var association2 = new collections.Association(key2, value2);
var association3 = new collections.Association(key3, value3);
var association4 = new collections.Association(key4, value4);
var association5 = new collections.Association(key5, value5);

var seeds = [
    association1,
    association2,
    association3,
    association4,
    association5
];
