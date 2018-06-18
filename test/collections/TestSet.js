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
            while (iterator.hasNext()) {
                var item = iterator.getNext();
                console.log('value: ' + item.value);
            }
            set.removeAll();
            size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

        it('should be able to add and remove items from a set', function() {
            var set = new collections.Set();
            var item2 = new Item(2);
            var item5 = new Item(5);
            var item3 = new Item(3);
            var item1 = new Item(1);
            var item4 = new Item(4);
            set.addItem(item2);
            set.addItem(item5);
            set.addItem(item3);
            set.addItem(item1);
            set.addItem(item4);
            var size = set.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            expect(set.getItem(2).value).to.equal(item2.value);
            expect(set.getItem(5).value).to.equal(item5.value);
            var iterator = set.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            var value = 0;
            var item;
            while (iterator.hasNext()) {
                value++;
                item = iterator.getNext();
                console.log('value: ' + item.value);
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
                console.log('value: ' + item.value);
                expect(item.value).to.equal(value);
            }
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

