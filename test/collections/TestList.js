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

    describe('Test the list constructors.', function() {

        it('should create a list with no items in it', function() {
            var list = new collections.List();
            expect(list).to.exist;  // jshint ignore:line
            var size = list.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
            var iterator = list.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === false);
            list.removeAll();
            var copy = list.emptyCopy();
            expect(copy).to.exist;  // jshint ignore:line
            expect(list.equalTo(copy)).to.equal(true);
            var signum = list.compareTo(copy);
            expect(signum).to.equal(0);
        });

        it('should create a list with initial items in it', function() {
            var list = new collections.List(items);
            var size = list.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            list = new collections.List(list);
            size = list.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            var iterator = list.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            list.removeAll();
            size = list.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

    });

    describe('Test the list methods.', function() {

        it('should be able to call the Collection class methods on the list', function() {
            var list1 = new collections.List();
            list1.addItem(new Item(1));
            list1.addItem(new Item(2));
            list1.addItem(new Item(3));
            var list2 = new collections.List();
            list2.addItem(new Item(4));
            list2.addItem(new Item(5));
            list1.addItems(list2);
            size = list1.getSize();
            expect(size).to.equal(5);
            expect(list1.containsAll(list2)).to.equal(true);
            expect(list2.containsAll(list1)).to.equal(false);
            expect(list2.containsAny(list1)).to.equal(true);
            var list3 = list1.getItems(2, 4);
            size = list3.getSize();
            expect(size).to.equal(3);
            expect(list3.containsItem(item4)).to.equal(true);
            expect(list3.containsItem(item1)).to.equal(false);
            expect(list3.getIndex(item3)).to.equal(2);
            list2.addItems(list1);
            size = list2.getSize();
            expect(size).to.equal(7);
            expect(list2.containsAll(list1)).to.equal(true);
            list2.removeItems(list3);
            size = list2.getSize();
            expect(size).to.equal(4);
            expect(list2.containsItem(item3)).to.equal(false);
        });

        it('should be able to add and remove items from a list', function() {
            var list = new collections.List(items);
            var size = list.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            expect(list.getItem(2).value).to.equal(item2.value);
            expect(list.getIndex(item1)).to.equal(1);
            expect(list.getItem(5).value).to.equal(item5.value);
            expect(list.getIndex(item3)).to.equal(3);
            var iterator = list.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            var value = 0;
            var item;
            while (iterator.hasNext()) {
                value++;
                item = iterator.getNext();
                expect(item.value).to.equal(value);
            }
            list.removeItem(item2);
            list.removeItem(item1);
            size = list.getSize();
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

        it('should be able to perform list operations on lists', function() {
            var list1 = new collections.List();
            list1.addItem(item1);
            list1.addItem(item2);
            list1.addItem(item3);
            var list2 = new collections.List();
            list2.addItem(item4);
            list2.addItem(item5);
            var list3 = new collections.List(items);
            expect(collections.List.concatenation(list1, list2).equalTo(list3)).to.equal(true);
        });

    });

    describe('Test the list iterators.', function() {

        it('should iterate over a list forwards and backwards', function() {
            var list = new collections.List(items);
            var iterator = list.iterator();
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


var item1 = new Item(1);
var item2 = new Item(2);
var item3 = new Item(3);
var item4 = new Item(4);
var item5 = new Item(5);

var items = [
    item1,
    item2,
    item3,
    item4,
    item5
];
