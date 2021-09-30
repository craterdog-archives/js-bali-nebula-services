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

const debug = 1;  // logging level in range [0..3]
const configuration = {
    names: 'bali-nebula-names-us-east-1',
    documents: 'bali-nebula-documents-us-east-1',
    contracts: 'bali-nebula-contracts-us-east-1',
    messages: 'bali-nebula-messages-us-east-1'
};

const bali = require('bali-component-framework').api();
const notary = require('bali-digital-notary').service(debug);
const storage = require('bali-document-repository').service(notary, configuration, debug);
const engine = require('bali-document-repository').engine(notary, storage, debug);


if (debug > 0) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');
exports.handler = async function(request) {
    const method = request.httpMethod || request.method;
    const path = request.path;
    if (debug > 0) console.log('Request  ' + method + ': ' + path);
    const response = await engine.processRequest(request);
    const status = response.statusCode;
    if (debug > 0) console.log('Response STATUS: ' + status + '\n');
    return response;
};
