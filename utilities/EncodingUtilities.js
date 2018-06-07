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

var forge = require('node-forge');
forge.options.usePureJavaScript = true;


/**
 * This private string acts as a lookup table for mapping one bit values to base 2
 * characters. 
 */
var base2LookupTable = "01";


/**
 * This function encodes a binary string into a base 2 string.
 *
 * @param {string} bytes The binary string containing the integer.
 * @param {string} indentation The string to be prepended to each line of the result.
 * @return {string} The corresponding base 2 string.
 */
exports.base2Encode = function(bytes, indentation) {

    // validate the parameters
    var base2 = '';
    if (typeof indentation === 'undefined' || indentation === null) indentation = '';
    var length = bytes.length;
    if (length === 0) return "";  // empty binary string

    if (length > 10) {
        base2 += '\n';
        base2 += indentation;
    }

    // encode each byte
    for (var i = 0; i < length; i++) {
        var byte = bytes.charCodeAt(i);

        // encode each bit
        for (var b = 7; b >= 0; b--) {
            var mask = 1 << b;
            var bit = (byte & mask) >>> b;
            base2 += base2LookupTable[bit];
        }

        // format as indented 80 character blocks
        if (i < length - 1 && i % 10 === 9) {
            base2 += '\n';
            base2 += indentation;
        }

    }

    return base2;
};


/**
 * This function decodes a base 2 encoded string into a binary string.
 *
 * @param {string} base2 The base 2 encoded string.
 * @return {string} The corresponding binary string.
 */
exports.base2Decode = function(base2) {

    // validate the base 2 encoded string
    base2 = base2.replace(/\s/g, "");  // strip out whitespace
    base2 = base2.toUpperCase();
    var length = base2.length;
    if (length % 8 !== 0) {
        throw new Error("ENCODING: The base 2 string must have a number of characters that is divisible by 8: " + base2);
    }

    // decode each base 2 character
    var bytes = '';
    var index = 0;
    while (index < length - 7) {

        // decode one byte
        var byte = 0;
        for (var b = 7; b >= 0; b--) {
            var character = base2[index++];
            var bit = base2LookupTable.indexOf(character);
            if (bit < 0) {
                throw new Error("ENCODING: Attempted to decode a string that is not base 2: " + base2);
            }
            byte |= (bit << b);
        }

        // append byte to binary string
        bytes += String.fromCharCode(byte);

    }

    return bytes;
};


/**
 * This private string acts as a lookup table for mapping four bit values to base 16
 * characters. 
 */
var base16LookupTable = "0123456789ABCDEF";


/**
 * This function encodes a binary string into a base 16 string.
 *
 * @param {string} bytes The binary string containing the integer.
 * @param {string} indentation The string to be prepended to each line of the result.
 * @return {string} The corresponding base 16 string.
 */
exports.base16Encode = function(bytes, indentation) {

    // validate the parameters
    var base16 = '';
    if (typeof indentation === 'undefined' || indentation === null) indentation = '';
    var length = bytes.length;
    if (length === 0) return "";  // empty binary string

    if (length > 40) {
        base16 += '\n';
        base16 += indentation;
    }

    // encode each byte
    for (var i = 0; i < length; i++) {
        var byte = bytes.charCodeAt(i);

        // encode high order nybble
        var highOrderNybble = (byte & 0xF0) >>> 4;
        base16 += base16LookupTable[highOrderNybble];

        // encode low order nybble
        var lowOrderNybble = byte & 0x0F;
        base16 += base16LookupTable[lowOrderNybble];

        // format as indented 80 character blocks
        if (i < length - 1 && i % 40 === 39) {
            base16 += '\n';
            base16 += indentation;
        }

    }

    return base16;
};


/**
 * This function decodes a base 16 encoded string into a binary string.
 *
 * @param {string} base16 The base 16 encoded string.
 * @return {string} The corresponding binary string.
 */
exports.base16Decode = function(base16) {

    // validate the base 16 encoded string
    base16 = base16.replace(/\s/g, "");  // strip out whitespace
    base16 = base16.toUpperCase();
    var length = base16.length;
    if (length % 2 !== 0) {
        throw new Error("ENCODING: The base 16 string must have an even number of characters: " + base16);
    }

    // decode each base 16 character
    var bytes = '';
    var index = 0;
    while (index < length - 1) {

        // decode the character for the high order nybble
        var character = base16[index++];
        var highOrderNybble = base16LookupTable.indexOf(character);
        if (highOrderNybble < 0) {
            throw new Error("ENCODING: Attempted to decode a string that is not base 16: " + base16);
        }

        // decode the character for the low order nybble
        character = base16[index++];
        var lowOrderNybble = base16LookupTable.indexOf(character);
        if (lowOrderNybble < 0) {
            throw new Error("ENCODING: Attempted to decode a string that is not base 16: " + base16);
        }

        // combine the nybbles to form the byte
        var charCode = (highOrderNybble << 4) | lowOrderNybble;
        bytes += String.fromCharCode(charCode);

    }

    return bytes;
};


/**
 * This private string acts as a lookup table for mapping five bit values to base 32
 * characters. It eliminate 4 vowels ("E", "I", "O", "U") to reduce any confusion with
 * 0 and O, 1 and I; and reduce the likelihood of *actual* (potentially offensive)
 * words from being included in a base 32 string.
 */
var base32LookupTable = "0123456789ABCDFGHJKLMNPQRSTVWXYZ";


/**
 * This function encodes a binary string into a base 32 string.
 *
 * @param {string} bytes The binary string containing the integer.
 * @param {string} indentation The string to be prepended to each line of the result.
 * @return {string} The corresponding base 32 string.
 */
exports.base32Encode = function(bytes, indentation) {

    // validate the parameters
    var base32 = '';
    if (typeof indentation === 'undefined' || indentation === null) indentation = '';
    var length = bytes.length;
    if (length === 0) return "";  // empty binary string

    if (length > 50) {
        base32 += '\n';
        base32 += indentation;
    }

    // encode each byte
    for (var i = 0; i < length; i++) {
        var previousByte = bytes.charCodeAt(i - 1);
        var currentByte = bytes.charCodeAt(i);

        // encode next one or two 5 bit chunks
        base32 = base32EncodeNextChucks(previousByte, currentByte, i, base32);

        // format as indented 80 character blocks
        if (i < length - 1 && i % 50 === 49) {
            base32 += '\n';
            base32 += indentation;
        }

    }

    // encode the last chunk
    var lastByte = bytes.charCodeAt(length - 1);
    base32 = base32EncodeLastChunk(lastByte, length - 1, base32);
    return base32;
};


/**
 * This function decodes a base 32 encoded string into a binary string.
 *
 * @param {string} base32 The base 32 encoded string.
 * @return {string} The corresponding binary string.
 */
exports.base32Decode = function(base32) {

    // validate the base 32 encoded string
    base32 = base32.replace(/\s/g, "");  // strip out whitespace
    base32 = base32.toUpperCase();
    var length = base32.length;

    var character;
    var chunk;

    // decode each base 32 character
    var bytes = new Uint8Array(Math.floor(length * 5 / 8));
    var index = 0;
    while (index < length - 1) {
        character = base32[index];
        chunk = base32LookupTable.indexOf(character);
        if (chunk < 0) {
            throw new Error("ENCODING: Attempted to decode a string that is not base 32: " + base32);
        }
        base32DecodeNextCharacter(chunk, index++, bytes, 0);
    }
    if (index < length) {
        character = base32[index];
        chunk = base32LookupTable.indexOf(character);
        if (chunk < 0) {
            throw new Error("ENCODING: Attempted to decode a string that is not base 32: " + base32);
        }
        base32DecodeLastCharacter(chunk, index, bytes, 0);
    }
    var result = "";
    for (var i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
    }
    return result;
};


/**
 * This function encodes a binary string into a base 64 string.
 *
 * @param {string} bytes The binary string containing the integer.
 * @param {string} indentation The string to be prepended to each line of the result.
 * @return {string} The corresponding base 64 string.
 */
exports.base64Encode = function(bytes, indentation) {

    // validate the parameters
    var base64 = '';
    if (typeof indentation === 'undefined' || indentation === null) indentation = '';
    var length = bytes.length;
    if (length === 0) return "";  // empty binary string

    // format as indented 80 character blocks
    if (length > 50) {
        base64 += '\n';
    }
    base64 += forge.util.encode64(bytes, 80);

    // insert indentations
    if (indentation) {
        base64 = base64.replace(/\n/g, '\n' + indentation);
    }

    return base64;
};


/**
 * This function decodes a base 64 encoded string into a binary string.
 *
 * @param {string} base64 The base 64 encoded string.
 * @return {string} The corresponding binary string.
 */
exports.base64Decode = function(base64) {
    return forge.util.decode64(base64);
};


/**
 * This private function converts an short into its corresponding bytes
 * in a binary string in 'big endian' order.
 *
 * @param {number} short The short to be converted.
 * @return {string} The corresponding binary string.
 */
exports.shortToBytes = function(short) {
    var bytes = '';
    for (var i = 1; i >= 0; i--) {
        var byte = short >> (i * 8) & 0xFF;
        bytes += String.fromCharCode(byte);
    }
    return bytes;
};


/**
 * This private function converts the bytes in a binary string in 'big endian'
 * order to its corresponding short value.
 *
 * @param {string} bytes The binary string containing the short.
 * @return {number} The corresponding short value.
 */
exports.bytesToShort = function(bytes) {
    var short = 0;
    for (var i = 0; i < 2; i++) {
        var byte = bytes.charCodeAt(1 - i);
        short |= byte << (i * 8);
    }
    return short;
};


/**
 * This private function converts an integer into its corresponding bytes
 * in a binary string in 'big endian' order.
 *
 * @param {number} integer The integer to be converted.
 * @return {string} The corresponding binary string.
 */
exports.integerToBytes = function(integer) {
    var bytes = '';
    for (var i = 3; i >= 0; i--) {
        var byte = integer >> (i * 8) & 0xFF;
        bytes += String.fromCharCode(byte);
    }
    return bytes;
};


/**
 * This private function converts the bytes in a binary string in 'big endian'
 * order to its corresponding integer value.
 *
 * @param {string} bytes The binary string containing the integer.
 * @return {number} The corresponding integer value.
 */
exports.bytesToInteger = function(bytes) {
    var integer = 0;
    for (var i = 0; i < 4; i++) {
        var byte = bytes.charCodeAt(3 - i);
        integer |= byte << (i * 8);
    }
    return integer;
};


// offset:    0        1        2        3        4        0
// byte:  00000111|11222223|33334444|45555566|66677777|...
// mask:   F8  07  C0 3E  01 F0  0F 80  7C 03  E0  1F   F8  07
function base32EncodeNextChucks(previous, current, byteIndex, base32) {
    var chunk;
    var offset = byteIndex % 5;
    switch (offset) {
        case 0:
            chunk = (current & 0xF8) >>> 3;
            base32 += base32LookupTable[chunk];
            break;
        case 1:
            chunk = ((previous & 0x07) << 2) | ((current & 0xC0) >>> 6);
            base32 += base32LookupTable[chunk];
            chunk = (current & 0x3E) >>> 1;
            base32 += base32LookupTable[chunk];
            break;
        case 2:
            chunk = ((previous & 0x01) << 4) | ((current & 0xF0) >>> 4);
            base32 += base32LookupTable[chunk];
            break;
        case 3:
            chunk = ((previous & 0x0F) << 1) | ((current & 0x80) >>> 7);
            base32 += base32LookupTable[chunk];
            chunk = (current & 0x7C) >>> 2;
            base32 += base32LookupTable[chunk];
            break;
        case 4:
            chunk = ((previous & 0x03) << 3) | ((current & 0xE0) >>> 5);
            base32 += base32LookupTable[chunk];
            chunk = current & 0x1F;
            base32 += base32LookupTable[chunk];
            break;
    }
    return base32;
}


// same as normal, but pad with 0's in "next" byte
// case:      0        1        2        3        4
// byte:  xxxxx111|00xxxxx3|00004444|0xxxxx66|000xxxxx|...
// mask:   F8  07  C0 3E  01 F0  0F 80  7C 03  E0  1F
function base32EncodeLastChunk(last, byteIndex, base32) {
    var chunk;
    var offset = byteIndex % 5;
    switch (offset) {
        case 0:
            chunk = (last & 0x07) << 2;
            base32 += base32LookupTable[chunk];
            break;
        case 1:
            chunk = (last & 0x01) << 4;
            base32 += base32LookupTable[chunk];
            break;
        case 2:
            chunk = (last & 0x0F) << 1;
            base32 += base32LookupTable[chunk];
            break;
        case 3:
            chunk = (last & 0x03) << 3;
            base32 += base32LookupTable[chunk];
            break;
        case 4:
            // nothing to do, was handled by previous call
            break;
    }
    return base32;
}


// offset:    0        1        2        3        4        0
// byte:  00000111|11222223|33334444|45555566|66677777|...
// mask:   F8  07  C0 3E  01 F0  0F 80  7C 03  E0  1F   F8  07
function base32DecodeNextCharacter(chunk, characterIndex, bytes, index) {
    var byteIndex = Math.floor(index + (characterIndex * 5) / 8);
    var offset = characterIndex % 8;
    switch (offset) {
        case 0:
            bytes[byteIndex] |= chunk << 3;
            break;
        case 1:
            bytes[byteIndex] |= chunk >>> 2;
            bytes[byteIndex + 1] |= chunk << 6;
            break;
        case 2:
            bytes[byteIndex] |= chunk << 1;
            break;
        case 3:
            bytes[byteIndex] |= chunk >>> 4;
            bytes[byteIndex + 1] |= chunk << 4;
            break;
        case 4:
            bytes[byteIndex] |= chunk >>> 1;
            bytes[byteIndex + 1] |= chunk << 7;
            break;
        case 5:
            bytes[byteIndex] |= chunk << 2;
            break;
        case 6:
            bytes[byteIndex] |= chunk >>> 3;
            bytes[byteIndex + 1] |= chunk << 5;
            break;
        case 7:
            bytes[byteIndex] |= chunk;
            break;
    }
}


// same as normal, but pad with 0's in "next" byte
// case:      0        1        2        3        4
// byte:  xxxxx111|00xxxxx3|00004444|0xxxxx66|00077777|...
// mask:   F8  07  C0 3E  01 F0  0F 80  7C 03  E0  1F
function base32DecodeLastCharacter(chunk, characterIndex, bytes, index) {
    var byteIndex = Math.floor(index + (characterIndex * 5) / 8);
    var offset = characterIndex % 8;
    switch (offset) {
        case 1:
            bytes[byteIndex] |= chunk >>> 2;
            break;
        case 3:
            bytes[byteIndex] |= chunk >>> 4;
            break;
        case 4:
            bytes[byteIndex] |= chunk >>> 1;
            break;
        case 6:
            bytes[byteIndex] |= chunk >>> 3;
            break;
        case 7:
            bytes[byteIndex] |= chunk;
            break;
    }
}
