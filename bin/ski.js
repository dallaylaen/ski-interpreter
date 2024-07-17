#!/usr/bin/env node

const {Runtime} = require('../index');

const input = process.argv[2];
if (typeof input !== 'string' || input === '--help') {
    console.log("Usage: ski.js <expression>");
    process.exit(1);
}

const ski = new Runtime();
let expr = ski.parse(process.argv[2]);

do {
    console.log(''+expr);
} while (expr = expr.step());
