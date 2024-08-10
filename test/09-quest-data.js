const { expect } = require('chai');
const { SKI, Quest } = require('../index');
const fs = require('node:fs').promises;

const dir = __dirname + '/../docs/quest-data/';

describe( 'quest-data dir', () => {
    it ('has index', done => {
        fs.readFile(dir+'index.json')
            .then(data => JSON.parse(data))
            .then(data => {
                expect(Array.isArray(data)).to.equal(true);
                done();
                data.map(checkChapter);
            })
            .catch(e => done(e));
    });
});

function checkChapter(entry, n) {
    describe('chapter ' + (n + 1), () => {
        it('has name', done => {
            expect(typeof entry.name).to.equal('string');
            done();
        });
        it('has intro', done => {
            for(let s of Array.isArray(entry.intro) ? entry.intro : [entry.intro])
                expect( typeof s ).to.equal('string');
            done();
        });
        it('has content linked to', done => {
            expect(typeof entry.link).to.equal('string');
            fs.readFile(dir+entry.link)
                .then(data => JSON.parse(data))
                .then(data => {
                    expect(Array.isArray(data)).to.equal(true, "chapter content must be array");
                    data.forEach((data, n) => checkQuest(data, entry.link, n));
                    done();
                })
                .catch(e => done(e));
        });
    });
}

function checkQuest(data, file, n) {
    describe('quest '+file+' ['+n+']', () => {
        it('can be used to create a quest', done => {
            const quest = new Quest(data);
            expect(quest instanceof Quest).to.equal(true, 'quest is a Quest');
            expect(typeof quest.title).to.equal('string');
            expect(typeof quest.descr).to.equal('string');

            if (quest.meta.solution) {
                const result = quest.check(quest.meta.solution);
                expect(result.pass).to.equal(true);
            }

            done();
        });
    });
}
