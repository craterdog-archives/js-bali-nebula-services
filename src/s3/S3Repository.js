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

///////////////////////////////////////////////////////////////////////////////////////
// This module should be used for LOCAL TESTING ONLY.  It is NOT SECURE and provides //
// no guarantees on protecting access to the documents.  YOU HAVE BEEN WARNED!!!     //
///////////////////////////////////////////////////////////////////////////////////////


/*
 * This module defines a singleton that implements an AWS S3 bucket based document
 * repository. It treats documents as UTF-8 encoded strings.
 */
const config = require('./Configuration.js');
const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework');
const EOL = '\n';  // POSIX compliant end of line


/**
 * This function returns an object that implements the API for an AWS S3 based document
 * repository.
 * 
 * will be logged to the error console.
 * @returns {Object} An object implementing the document repository interface.
 */
exports.repository = function() {

    // return a singleton object for the API
    return {

        /**
         * This function returns a string providing attributes about this repository.
         * 
         * @returns {String} A string providing attributes about this repository.
         */
        toString: function() {
            return bali.catalog({
                $module: '/bali/repositories/S3Repository',
                $url: this.getURL()
            });
        },

        /**
         * This function returns a reference to this document repository.
         * 
         * @returns {Reference} A reference to this document repository.
         */
        getURL: function() {
            return bali.reference(config.cloudURL);
        },

        /**
         * This function checks to see whether or not an account is associated with the
         * specified identifier.
         * 
         * @param {String} accountId The unique identifier for the account being checked.
         * @returns {Boolean} Whether or not the account exists.
         */
        accountExists: async function(accountId) {
            const filename = accountId + '.bali';
            const exists = await doesExist(config.accountBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified account from the repository.
         * 
         * @param {String} accountId The unique identifier for the account being fetched.
         * @returns {String} The canonical source string for the account, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchAccount: async function(accountId) {
            var account;
            const filename = accountId + '.bali';
            const exists = await doesExist(config.accountBucket, filename);
            if (exists) {
                account = await getObject(config.accountBucket, filename);
                account = account.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return account;
        },

        /**
         * This function creates a new account in the repository.
         * 
         * @param {String} accountId The unique identifier for the account being created.
         * @param {String} account The canonical source string for the account.
         */
        createAccount: async function(accountId, account) {
            const filename = accountId + '.bali';
            const exists = await doesExist(config.accountBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createAccount',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            const document = account + EOL;  // add POSIX compliant <EOL>
            await putObject(config.accountBucket, filename, document);
        },

        /**
         * This function checks to see whether or not a certificate is associated with the
         * specified identifier.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being checked.
         * @returns {Boolean} Whether or not the certificate exists.
         */
        certificateExists: async function(certificateId) {
            const filename = certificateId + '.bali';
            const exists = await doesExist(config.certificateBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified certificate from the repository.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being fetched.
         * @returns {String} The canonical source string for the certificate, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchCertificate: async function(certificateId) {
            var certificate;
            const filename = certificateId + '.bali';
            const exists = await doesExist(config.certificateBucket, filename);
            if (exists) {
                certificate = await getObject(config.certificateBucket, filename);
                certificate = certificate.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return certificate;
        },

        /**
         * This function creates a new certificate in the repository.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being created.
         * @param {String} certificate The canonical source string for the certificate.
         */
        createCertificate: async function(certificateId, certificate) {
            const filename = certificateId + '.bali';
            const exists = await doesExist(config.certificateBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createCertificate',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            const document = certificate + EOL;  // add POSIX compliant <EOL>
            await putObject(config.certificateBucket, filename, document);
        },

        /**
         * This function checks to see whether or not a draft document is associated with the
         * specified identifier.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being checked.
         * @returns {Boolean} Whether or not the draft document exists.
         */
        draftExists: async function(draftId) {
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being fetched.
         * @returns {String} The canonical source string for the draft document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDraft: async function(draftId) {
            var draft;
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            if (exists) {
                draft = await getObject(config.draftBucket, filename);
                draft = draft.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return draft;
        },

        /**
         * This function updates an existing draft document in the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being updated.
         * @param {String} draft The canonical source string for the draft document.
         */
        saveDraft: async function(draftId, draft) {
            const filename = draftId + '.bali';
            const document = draft + EOL;  // add POSIX compliant <EOL>
            await putObject(config.draftBucket, filename, document);
        },

        /**
         * This function attempts to delete the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being deleted.
         */
        deleteDraft: async function(draftId) {
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            if (exists) {
                await deleteObject(config.draftBucket, filename);
            }
        },

        /**
         * This function checks to see whether or not a document is associated with the
         * specified identifier.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being checked.
         * @returns {Boolean} Whether or not the document exists.
         */
        documentExists: async function(documentId) {
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified document from the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being fetched.
         * @returns {String} The canonical source string for the document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDocument: async function(documentId) {
            var document;
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            if (exists) {
                document = await getObject(config.documentBucket, filename);
                document = document.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return document;
        },

        /**
         * This function creates a new document in the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being created.
         * @param {String} document The canonical source string for the document.
         */
        createDocument: async function(documentId, document) {
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createDocument',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            document = document + EOL;  // add POSIX compliant <EOL>
            await putObject(config.documentBucket, filename, document);
        },

        /**
         * This function checks to see whether or not a type is associated with the
         * specified identifier.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being checked.
         * @returns {Boolean} Whether or not the type exists.
         */
        typeExists: async function(typeId) {
            const filename = typeId + '.bali';
            const exists = await doesExist(config.typeBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified type from the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being fetched.
         * @returns {String} The canonical source string for the type, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchType: async function(typeId) {
            var type;
            const filename = typeId + '.bali';
            const exists = await doesExist(config.typeBucket, filename);
            if (exists) {
                type = await getObject(config.typeBucket, filename);
                type = type.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return type;
        },

        /**
         * This function creates a new type in the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being created.
         * @param {String} type The canonical source string for the type.
         */
        createType: async function(typeId, type) {
            const filename = typeId + '.bali';
            const exists = await doesExist(config.typeBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createType',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            const document = type + EOL;  // add POSIX compliant <EOL>
            await putObject(config.typeBucket, filename, document);
        },

        /**
         * This function adds a new message onto the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @param {String} message The canonical source string for the message.
         */
        queueMessage: async function(queueId, message) {
            const messageId = bali.tag().getValue();
            const filename = queueId + '/' + messageId + '.bali';
            const exists = await doesExist(config.queueBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$queueMessage',
                    $exception: '$messageExists',
                    $message: bali.text(filename),
                    $text: bali.text('The message to be written already exists.')
                });
            }
            const document = message + EOL;  // add POSIX compliant <EOL>
            await putObject(config.queueBucket, filename, document);
        },

        /**
         * This function removes a message (at random) from the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @returns {String} The canonical source string for the message.
         */
        dequeueMessage: async function(queueId) {
            var message;
            while (true) {
                const messages = (await listObjects(config.queueBucket, queueId));
                if (messages && messages.length) {
                    // select a message a random since a distributed queue cannot guarantee FIFO
                    const count = messages.length;
                    const index = bali.random.index(count) - 1;  // convert to zero based indexing
                    const filename = messages[index].Key;
                    message = await getObject(config.queueBucket, filename);
                    message = message.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                    try {
                        await deleteObject(config.queueBucket, filename);
                        break; // we got there first
                    } catch (exception) {
                        // another process got there first
                        message = undefined;
                    }
                } else {
                    break;  // no more messages
                }
            }
            return message;
        }

    };
};


// PRIVATE FUNCTIONS

const listObjects = async function(bucket, prefix) {
    return new Promise(function(resolve, reject) {
        try {
            s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: 64}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Contents);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const doesExist = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Body.toString());
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const putObject = async function(bucket, key, object) {
    return new Promise(function(resolve, reject) {
        try {
            s3.putObject({Bucket: bucket, Key: key, Body: object.toString()}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const deleteObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.deleteObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
