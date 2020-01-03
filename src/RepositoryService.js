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

const debug = 2;  // logging level in range [0..3]
const configuration = {
    uri: 'https://bali-nebula.net/repository/',
    citations: 'craterdog-bali-citations-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    queues: 'craterdog-bali-queues-us-west-2'
};

const bali = require('bali-component-framework').api(debug);
const notary = require('bali-digital-notary').service(debug);
const repository = require('bali-document-repository').service(notary, configuration, debug);
const style = 'https://bali-nebula.net/static/styles/BDN.css';

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';


// PUBLIC FUNCTIONS

if (debug > 2) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');
exports.handler = async function(request) {
    var parameters;
    try {
        // extract the request parameters
        parameters = decodeRequest(request);
        if (!parameters) {
            if (debug > 2) console.log('The service received a badly formed request.');
            return encodeError(400, 'Bad Request');
        }

        // validate any credentials that were passed with the request (there may not be any)
        if (!(await validCredentials(parameters))) {
            if (debug > 2) console.log('Invalid credentials were passed with the request.');
            const response = encodeError(401, 'Invalid Credentials');
            response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
            return response;
        }

        // validate the request type
        if (!handleRequest[parameters.type]) {
            if (debug > 2) console.log('The service received an invalid request type: ' + parameters.type);
            return encodeError(400, 'Bad Request');
        }

        // validate the request method
        if (!handleRequest[parameters.type][parameters.method]) {
            if (debug > 2) console.log('The service received an invalid request method: ' + parameters.method);
            return encodeError(405, 'Method Not Allowed');
        }

        // handle the request
        return handleRequest[parameters.type][parameters.method](parameters);

    } catch (cause) {
        if (debug > 0) {
            const exception = bali.exception({
                $module: '/bali/services/Repository',
                $procedure: '$handler',
                $exception: '$processingFailed',
                $parameters: parameters,
                $text: 'The processing of the HTTP request failed.'
            }, cause);
            console.log(exception.toString());
            console.log('Response: 503 (Service Unavailable)');
        }
        return encodeError(503, 'Service Unavailable');
    }
};


// PRIVATE FUNCTIONS

const decodeRequest = function(request) {
    try {
        if (debug > 0) console.log('Request ' + request.httpMethod + ': ' + request.path);
        var responseType = request.headers['Accept'] || request.headers['accept'];
        if (responseType !== 'application/bali') responseType = 'text/html';  // for a browser
        var credentials = request.headers['Nebula-Credentials'] || request.headers['nebula-credentials'];
        if (credentials) {
            credentials = decodeURI(credentials).slice(2, -2);  // strip off double quote delimiters
            credentials = bali.component(credentials);
        }
        const method = request.httpMethod.toUpperCase();
        var path = request.path.slice(1);  // remove the leading '/'
        path = path.slice(path.indexOf('/') + 1);  // remove leading 'repository/'
        const type = path.slice(0, path.indexOf('/'));  // extract type from <type>/<identifier>
        const identifier = path.slice(path.indexOf('/') + 1);  // extract identifier from <type>/<identifier>
        const body = request.body ? bali.component(request.body) : undefined;
        const parameters = {
            responseType: responseType,
            credentials: credentials,
            method: method,
            type: type,
            identifier: identifier,
            body: body
        };
        if (debug > 2) console.log('Parameters: ' + bali.catalog(parameters).toString());
        return parameters;
    } catch (cause) {
        if (debug > 2) console.log('An error occurred while attempting to extract the request parameters: ' + cause);
    }
};


const validCredentials = async function(parameters) {
    try {
        const credentials = parameters.credentials;
        if (credentials) {
            const citation = credentials.getValue('$certificate');
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            // if the certificate doesn't yet exist, there is a self-signed certificate in the body
            var certificate = (await repository.fetchDocument(tag, version)) || parameters.body;
            if (await notary.validDocument(credentials, certificate)) {
                parameters.account = certificate.getValue('$account');
                return true;  // the credentials are valid
            }
            return false;  // the credentials are invalid
        }
        return true;  // no credentials were passed in, proceed anonymously
    } catch (cause) {
        if (debug > 2) console.log('An error occurred while attempting to extract the request credentials: ' + cause);
        return false;  // the credentials were badly formed
    }
};


const isAuthenticated = function(parameters) {
    return !!parameters.account;
};


const isAuthorized = function(account, document) {
    if (document) {
        // check the owner of the document
        const owner = document.getValue('$account');
        if (owner && owner.isEqualTo(account)) return true;  // the document owner is always authorized

        // check for a citation rather than a notarized document
        const content = document.getValue('$content');
        if (!content) return true;  // all citations are public by default

        // check the permissions on the document
        const permissions = content.getParameter('$permissions');
        if (permissions.toString() === '/bali/permissions/public/v1') return true;  // publicly available
        // TODO: load in the real permissions and check them

    }

    return false;  // otherwise the account is not authorized to access the document
};


const encodeError = function(statusCode, statusString) {
    const response = {
        headers: {
            'Content-Length': 0
        },
        statusCode: statusCode
    };
    if (debug > 0) console.log('Response ' + statusCode + ': ' + statusString);
    return response;
};


/*
 * This method enforces strict symantics on the five methods supported by all resources that
 * are managed by the Bali Nebula™ services.  For details on the symantics see this page:
 * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
 */
const handleRequest = {

    citations: {
        HEAD: async function(parameters) {
            var statusString;
            const name = bali.component('/' + parameters.identifier);
            const existing = await repository.fetchCitation(name);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    response.statusCode = 200;
                    statusString = 'Citation Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Citation Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        GET: async function(parameters) {
            var statusString;
            const name = bali.component('/' + parameters.identifier);
            const existing = await repository.fetchCitation(name);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    switch (parameters.responseType) {
                        case 'application/bali':
                            response.body = existing.toBDN();
                            break;
                        case 'text/html':
                        default:
                            response.body = existing.toHTML(style);
                            response.headers['Access-Control-Allow-Origin'] = 'bali-nebula.net';
                    }
                    response.headers['Content-Length'] = response.body.length;
                    response.headers['Content-Type'] = parameters.responseType;
                    response.headers['Cache-Control'] = 'immutable';
                    response.statusCode = 200;
                    statusString = 'Citation Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Citation Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        POST: async function(parameters) {
            var statusString;
            const name = bali.component('/' + parameters.identifier);
            const citation = parameters.body;
            const existing = await repository.fetchCitation(name);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    response.statusCode = 409;
                    statusString = 'Citation Already Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    const tag = citation.getValue('$tag');
                    const version = citation.getValue('$version');
                    if (!(await repository.documentExists(tag, version))) {
                        response.statusCode = 409;
                        statusString = 'Cited Document Must Exist';
                    }
                    await repository.createCitation(name, citation);
                    response.statusCode = 201;
                    statusString = 'Citation Created';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        PUT: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Updates Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        DELETE: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Deletion Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        }
    },

    drafts: {
        HEAD: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    response.statusCode = 200;
                    statusString = 'Draft Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Draft Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        GET: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    switch (parameters.responseType) {
                        case 'application/bali':
                            response.body = existing.toBDN();
                            break;
                        case 'text/html':
                        default:
                            response.body = existing.toHTML(style);
                            response.headers['Access-Control-Allow-Origin'] = 'bali-nebula.net';
                    }
                    response.headers['Content-Length'] = response.body.length;
                    response.headers['Content-Type'] = parameters.responseType;
                    response.headers['Cache-Control'] = 'immutable';
                    response.statusCode = 200;
                    statusString = 'Draft Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Draft Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        POST: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Posts Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        PUT: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const draft = parameters.body;
            const existing = await repository.fetchDraft(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    await repository.saveDraft(draft);
                    response.statusCode = 204;
                    statusString = 'Draft Updated';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    await repository.saveDraft(draft);
                    response.statusCode = 201;
                    statusString = 'Draft Created';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        DELETE: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    if (authenticated) {
                        await repository.deleteDraft(tag, version);
                        switch (parameters.responseType) {
                            case 'application/bali':
                                response.body = existing.toBDN();
                                break;
                            case 'text/html':
                            default:
                                response.body = existing.toHTML(style);
                                response.headers['Access-Control-Allow-Origin'] = 'bali-nebula.net';
                        }
                        response.headers['Content-Length'] = response.body.length;
                        response.headers['Content-Type'] = parameters.responseType;
                        response.headers['Cache-Control'] = 'no-store';
                        response.statusCode = 200;
                        statusString = 'Draft Deleted';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Draft Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        }
    },

    documents: {
        HEAD: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDocument(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    response.statusCode = 200;
                    statusString = 'Document Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Document Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        GET: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDocument(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    switch (parameters.responseType) {
                        case 'application/bali':
                            response.body = existing.toBDN();
                            break;
                        case 'text/html':
                        default:
                            response.body = existing.toHTML(style);
                            response.headers['Access-Control-Allow-Origin'] = 'bali-nebula.net';
                    }
                    response.headers['Content-Length'] = response.body.length;
                    response.headers['Content-Type'] = parameters.responseType;
                    response.headers['Cache-Control'] = 'immutable';
                    response.statusCode = 200;
                    statusString = 'Document Retrieved';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    response.statusCode = 404;
                    statusString = 'Document Not Found';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        POST: async function(parameters) {
            var statusString;
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const document = parameters.body;
            const existing = await repository.fetchDocument(tag, version);
            const authenticated = isAuthenticated(parameters);
            const authorized = isAuthorized(parameters, existing);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (existing) {
                if (authorized) {
                    response.statusCode = 409;
                    statusString = 'Document Already Exists';
                } else {
                    if (authenticated) {
                        response.statusCode = 403;
                        statusString = 'Not Authorized';
                    } else {
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                    }
                }
            } else {
                if (authenticated) {
                    await repository.createDocument(document);
                    await repository.deleteDraft(tag, version);
                    response.statusCode = 201;
                    statusString = 'Document Created';
                } else {
                    response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                    response.statusCode = 401;
                    statusString = 'Not Authenticated';
                }
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        PUT: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Updates Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        DELETE: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Deletion Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        }
    },

    queues: {
        HEAD: async function(parameters) {
            var statusString;
            const queue = bali.component('#' + parameters.identifier);
            const authenticated = isAuthenticated(parameters);
            const exists = await repository.queueExists(queue);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (authenticated) {
                if (exists) {
                    response.statusCode = 200;
                    statusString = 'Queue Exists';
                } else {
                    response.statusCode = 404;
                    statusString = 'Queue Not Found';
                }
            } else {
                response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                response.statusCode = 401;
                statusString = 'Not Authenticated';
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        GET: async function(parameters) {
            var statusString;
            const queue = bali.component('#' + parameters.identifier);
            const authenticated = isAuthenticated(parameters);
            const exists = await repository.queueExists(queue);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (authenticated) {
                const count = await repository.messageCount(queue);
                response.body = count.toString();
                response.headers['Content-Length'] = response.body.length;
                response.headers['Content-Type'] = parameters.responseType;
                response.headers['Cache-Control'] = 'immutable';
                response.statusCode = 200;
                statusString = 'Message Count Retrieved';
            } else {
                response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                response.statusCode = 401;
                statusString = 'Not Authenticated';
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        POST: async function(parameters) {
            const response = {
                headers: {
                    'Content-Length': 0
                },
                statusCode: 405
            };
            const statusString = 'Posts Not Supported';
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        PUT: async function(parameters) {
            var statusString;
            const queue = bali.component('#' + parameters.identifier);
            const authenticated = isAuthenticated(parameters);
            const exists = await repository.queueExists(queue);
            const message = parameters.body;
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (authenticated) {
                await repository.queueMessage(queue, message);
                response.statusCode = exists ? 204 : 201;
                statusString = 'Message Queued';
            } else {
                response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                response.statusCode = 401;
                statusString = 'Not Authenticated';
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        },

        DELETE: async function(parameters) {
            var statusString;
            const queue = bali.component('#' + parameters.identifier);
            const authenticated = isAuthenticated(parameters);
            const exists = await repository.queueExists(queue);
            const response = {
                headers: {
                    'Content-Length': 0
                }
            };
            if (authenticated) {
                if (exists) {
                    const message = await repository.dequeueMessage(queue);
                    switch (parameters.responseType) {
                        case 'application/bali':
                            response.body = message.toBDN();
                            break;
                        case 'text/html':
                        default:
                            response.body = message.toHTML(style);
                            response.headers['Access-Control-Allow-Origin'] = 'bali-nebula.net';
                    }
                    response.headers['Content-Length'] = response.body.length;
                    response.headers['Content-Type'] = parameters.responseType;
                    response.headers['Cache-Control'] = 'no-store';
                    response.statusCode = 200;
                    statusString = 'Message Retrieved';
                } else {
                    response.statusCode = 404;
                    statusString = 'Queue Not Found';
                }
            } else {
                response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                response.statusCode = 401;
                statusString = 'Not Authenticated';
            }
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
            return response;
        }
    }

};
