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
                            let q;
                            try {
                                q = new Quest(quest)
                            } catch (e) {
                                // do nothing, will be rejected later
                            }
                            it('is a quest', () => {
                                expect( q instanceof Quest).to.equal(true, 'A quest was generated');
                                expect( q.cases.length ).to.be.within(1, Infinity, 'At least 1 case');
                            });
                            if (!(q instanceof Quest))
                                return;
                            it('has title & description', () => {
                                expect(typeof q.descr).to.equal('string');
                                expect( typeof q.title ).to.equal('string');
                            });
                            if (quest.solution) {
                                it ('passes included example solution', () => {
                                    const result = q.check(quest.solution);
                                    expect( result.pass ).to.equal(true);
                                });
                            }
                        });
                    }
                });
            });
        }
    });
});
