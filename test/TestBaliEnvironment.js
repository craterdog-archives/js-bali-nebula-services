/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;

var testDirectory = 'test/config/';
var notaryKey = require('bali-digital-notary/BaliNotary').notaryKey(testDirectory);
var repository = require('bali-cloud-api/LocalRepository').repository(testDirectory);
/*  uncomment to generate a new notary key and certificate
var certificate = notaryKey.generateKeys();
var citation = notaryKey.certificateCitation();
repository.storeCertificate(certificate);
/*                                                         */
var cloud = require('bali-cloud-api/BaliAPI').cloud(notaryKey, repository);
var environment = require('../BaliEnvironment').environment(cloud);

describe('Bali Cloud Environment™', function() {

    describe('Test the deployment of the Bali primitive types.', function() {

    });

});
