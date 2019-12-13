/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 1;  // [0..3]
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');
const bali = require('bali-component-framework').api(debug);
const service = require('../src/HTMLService');

const HTMLClient = function(service, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off

    this.imageExists = async function(resource) {
        const request = {
            httpMethod: 'HEAD',
            path: '/web/images/' + resource
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchImage = async function(resource) {
        const request = {
            httpMethod: 'GET',
            path: '/web/images/' + resource
        };
        const response = await service.handler(request);
        const image = response.body;
        return image;
    };

    this.styleExists = async function(resource) {
        const request = {
            httpMethod: 'HEAD',
            path: '/web/style/' + resource
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchStyle = async function(resource) {
        const request = {
            httpMethod: 'GET',
            path: '/web/style/' + resource
        };
        const response = await service.handler(request);
        const style = response.body;
        return style;
    };

    return this;
};
HTMLClient.prototype.constructor = HTMLClient;


describe('Bali Nebula™ Repository Service', function() {

    const client = new HTMLClient(service, debug);

    describe('Test HTML Service', function() {

        it('should check the existence of the style sheet', async function() {
            var exists = await client.styleExists('BDN.css');
            expect(exists).is.true;
        });

        it('should retrieve the style sheet', async function() {
            const style = await client.fetchStyle('BDN.css');
            expect(style).to.exist;
        });

        it('should check the existence of an image', async function() {
            var exists = await client.imageExists('PoweredByLogo.png');
            expect(exists).is.true;
        });

        it('should retrieve the image', async function() {
            const image = await client.fetchImage('PoweredByLogo.png');
            expect(image).to.exist;
        });

    });
});
