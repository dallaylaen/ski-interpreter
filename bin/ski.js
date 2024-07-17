#!/usr/bin/env node

const {SKI} = require('../index');

const input = process.argv[2];
if (typeof input !== 'string' || input === '--help') {
    console.log("Usage: ski.js <expression>");
    process.exit(1);
}

const ski = new SKI();
let expr = ski.parse(process.argv[2]);

do {
    console.log(''+expr);
} while (expr = expr.step());
