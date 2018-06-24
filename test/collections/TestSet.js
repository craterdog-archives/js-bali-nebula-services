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

    describe('Test the set constructors.', function() {

        it('should create a set with no items in it', function() {
            var set = new collections.Set();
            expect(set).to.exist;  // jshint ignore:line
            var size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
            var iterator = set.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === false);
            set.removeAll();
            var copy = set.emptyCopy();
            expect(copy).to.exist;  // jshint ignore:line
            expect(set.equalTo(copy)).to.equal(true);
            var signum = set.compareTo(copy);
            expect(signum).to.equal(0);
        });

        it('should create a set with initial items in it', function() {
            var set = new collections.Set();
            set.addItem(new Item(1));
            set.addItem(new Item(2));
            set.addItem(new Item(3));
            set.addItem(new Item(4));
            set.addItem(new Item(5));
            var size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            set = new collections.Set(set);
            size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            var iterator = set.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            set.removeAll();
            size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

    });

    describe('Test the set methods.', function() {

        it('should be able to call the Collection class methods on the set', function() {
            var item1 = new Item(1);
            var item2 = new Item(2);
            var item3 = new Item(3);
            var item4 = new Item(4);
            var item5 = new Item(5);
            var set1 = new collections.Set();
            set1.addItem(item1);
            set1.addItem(item2);
            set1.addItem(item4);
            var set2 = new collections.Set();
            set2.addItem(item5);
            set2.addItem(item3);
            set1.addItems(set2);
            size = set1.getSize();
            expect(size).to.equal(5);
            expect(set1.containsAll(set2)).to.equal(true);
            expect(set2.containsAll(set1)).to.equal(false);
            expect(set2.containsAny(set1)).to.equal(true);
            var set3 = set1.getItems(2, 4);
            size = set3.getSize();
            expect(size).to.equal(3);
            expect(set3.containsItem(item4)).to.equal(true);
            expect(set3.containsItem(item1)).to.equal(false);
            expect(set3.getIndex(item3)).to.equal(2);
            set2.addItems(set1);
            size = set2.getSize();
            expect(size).to.equal(5);
            expect(set2.containsAll(set1)).to.equal(true);
            set2.removeItems(set3);
            size = set2.getSize();
            expect(size).to.equal(2);
            expect(set2.containsItem(item3)).to.equal(false);
        });

        it('should be able to add and remove items from a set', function() {
            var set = new collections.Set();
            var item1 = new Item(1);
            var item2 = new Item(2);
            var item3 = new Item(3);
            var item4 = new Item(4);
            var item5 = new Item(5);
            set.addItem(item2);
            set.addItem(item5);
            set.addItem(item3);
            set.addItem(item1);
            set.addItem(item4);
            var size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            expect(set.getItem(2).value).to.equal(item2.value);
            expect(set.getIndex(item1)).to.equal(1);
            expect(set.getItem(5).value).to.equal(item5.value);
            expect(set.getIndex(item3)).to.equal(3);
            var iterator = set.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            var value = 0;
            var item;
            while (iterator.hasNext()) {
                value++;
                item = iterator.getNext();
                expect(item.value).to.equal(value);
            }
            set.removeItem(item2);
            set.removeItem(item1);
            size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(3);
            iterator.toStart();
            value = 2;
            while (iterator.hasNext()) {
                value++;
                item = iterator.getNext();
                expect(item.value).to.equal(value);
            }
        });

        it('should be able to perform set operations on sets', function() {
            var item1 = new Item(1);
            var item2 = new Item(2);
            var item3 = new Item(3);
            var item4 = new Item(4);
            var item5 = new Item(5);
            var set1 = new collections.Set();
            set1.addItem(item1);
            set1.addItem(item2);
            set1.addItem(item3);
            var set2 = new collections.Set();
            set2.addItem(item2);
            set2.addItem(item3);
            set2.addItem(item4);
            set2.addItem(item5);
            var set3 = new collections.Set();
            set3.addItem(item2);
            set3.addItem(item3);
            expect(collections.Set.and(set1, set2).equalTo(set3)).to.equal(true);
            var set4 = new collections.Set();
            set4.addItem(item1);
            expect(collections.Set.sans(set1, set2).equalTo(set4)).to.equal(true);
            var set5 = new collections.Set();
            set5.addItem(item1);
            set5.addItem(item2);
            set5.addItem(item3);
            set5.addItem(item4);
            set5.addItem(item5);
            expect(collections.Set.or(set1, set2).equalTo(set5)).to.equal(true);
            var set6 = new collections.Set();
            set6.addItem(item1);
            set6.addItem(item4);
            set6.addItem(item5);
            expect(collections.Set.xor(set1, set2).equalTo(set6)).to.equal(true);
        });

    });

    describe('Test the set iterators.', function() {

        it('should iterate over a set forwards and backwards', function() {
            var set = new collections.Set();
            set.addItem(new Item(1));
            set.addItem(new Item(2));
            set.addItem(new Item(3));
            set.addItem(new Item(4));
            set.addItem(new Item(5));
            var iterator = set.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            iterator.toEnd();
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === true);
            var item;
            while (iterator.hasPrevious()) {
                item = iterator.getPrevious();
            }
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            item = iterator.getNext();
            expect(item.value).to.equal(1);
            item = iterator.getNext();
            expect(item.value).to.equal(2);
            item = iterator.getPrevious();
            expect(item.value).to.equal(2);
            item = iterator.getPrevious();
            expect(item.value).to.equal(1);
            while (iterator.hasNext()) {
                item = iterator.getNext();
            }
            iterator.toStart();
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
        });

    });

});

function Item(value) {
    this.value = value;
    return this;
}
Item.prototype.constructor = Item;


Item.prototype.equalTo = function(that) {
    return this.value === that.value;
};


Item.prototype.compareTo = function(that) {
    if (this.value < that.value) return -1;
    if (this.value === that.value) return 0;
    if (this.value > that.value) return 1;
};

