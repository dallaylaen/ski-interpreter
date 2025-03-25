const { expect } = require('chai');
const { SKI, Quest } = require('../index');
const fs = require('node:fs').promises;

const dir = __dirname + '/../docs/quest-data/';

describe( 'quest-data', async () => {
  const uniq = new Set();

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
          const raw = await fs.readFile(dir + entry.link)
            .then(data => JSON.parse(data));

          const content = Array.isArray(raw) ? raw : raw.content;

          expect(Array.isArray(content)).to.equal(true, 'Content must be an array');

          for (let i = 0; i < content.length; i++) {
            const quest = content[i];
            describe('quest ' + entry.link + ' [' + i + '] ' + content[i].id, async () => {
              let q, err;
              try {
                q = new Quest(quest)
              } catch (e) {
                err = e;
                // do nothing, will be rejected later
              }
              it('is a quest', () => {
                if (err)
                  throw err;
                expect( q ).to.be.instanceof(Quest, 'A quest was generated');
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
                  if (!result.pass) {
                    console.log('proposed solution failed: '+result.expr.expand().toString({terse: false}));
                    for (const entry of result.details) {
                      console.log("found:    " + entry.found);
                      console.log("expected: " + entry.expected);
                    }
                  }
                  expect( result.pass ).to.equal(true);
                });
              }
              for (const wrong of quest.wrong ?? []) {
                it ('fails on wrong solution: '+wrong, () => {
                  const result = q.check(wrong);
                  expect( result.pass ).to.equal(false);
                  // TODO check error details but later
                });
              }
              it ('has unique id', () => {
                const id = q.meta.id;
                expect(typeof id).to.equal('string');
                expect(id).to.match(/\S/);
                expect(uniq.has(id)).to.equal(false, 'quest id is unique: '+id);
                uniq.add(id);
              });
            });
          }
        });
      });
    }
  });
});
