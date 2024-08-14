const { expect } = require('chai');
const { SKI, Quest } = require('../index');
const fs = require('node:fs').promises;

const dir = __dirname + '/../docs/quest-data/';

describe( 'quest-data', async () => {
    it ('has index', async () => {
        const index = await fs.readFile(dir + 'index.json')
            .then(data => JSON.parse(data));

        expect(Array.isArray(index)).to.equal(true, 'index is an array');

        for (let n = 0; n < index.length; n++) {
            const entry = index[n];
            describe('entry ' + n + ' ' + (entry.link ?? 'empty'), async () => {
                it('has title', async () => {
                    expect(typeof entry.name).to.equal('string');
                });
                it('has description', async () => {
                    const intro = Array.isArray(entry.intro) ? entry.intro : [entry.intro];
                    for (const s of intro)
                        expect(typeof s).to.equal('string');
                })
                it('has actual file with quest data array', async () => {
                    expect(typeof entry.link).to.equal('string');
                    const content = await fs.readFile(dir + entry.link)
                        .then(data => JSON.parse(data));

                    expect(Array.isArray(content)).to.equal(true, 'Content must be an array');

                    for (let i = 0; i < content.length; i++) {
                        const quest = content[i];
                        describe('quest ' + entry.link + ' [' + i + ']', async () => {
                            it('is a quest', () => {
                                const q = new Quest(quest);
                                expect(typeof q.descr).to.equal('string');
                                expect( typeof q.title ).to.equal('string');
                                expect( q.cases.length ).to.be.within(1, Infinity, 'At least 1 case');
                            });
                        });
                    }
                });
            });
        }
    });
});
