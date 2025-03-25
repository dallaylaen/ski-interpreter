const {expect} = require('chai');
const fs = require('node:fs').promises;

const { Tokenizer } = require('../lib/util');
const {SKI, Quest} = require('../index');

const dir = __dirname + '/../docs/quest-data/';

const uniqQuest = new Set();
const uniqChapter = new Set();

describe('quest-data', () => {
  it('has index', async () => {
    const index = await fs.readFile(dir + 'index.json')
      .then(data => JSON.parse(data));

    expect(Array.isArray(index)).to.equal(true, 'index is an array');

    describe('index', () => {
      for (let n = 0; n < index.length; n++) {
        const entry = index[n];
        it('entry ' + n + ' has quest file ' + entry.link, () => {
          expect(typeof entry.link).to.equal('string');
          return fs.readFile(dir + entry.link)
            .then(data => JSON.parse(data))
            .then(raw => {
              raw = Array.isArray(raw) ? { content: raw } : raw;
              const merged = { ...entry, ...raw};
              verifyChapter (merged, n);
            });
        });
      }
    });
  });
});

function verifyChapter (entry, n) {
  describe('chapter ' + n + ' ' + (entry.link ?? 'empty'), () => {
    it ('has uniques id', () => {
      expect(entry.id).to.be.a('string');
      expect(uniqChapter.has(entry.id)).to.equal(false, 'chapter id is unique: ' + entry.id);
      uniqChapter.add(entry.id);
    });
    it('has title', async () => {
      expect(typeof entry.name).to.equal('string');
    });
    it('has description', async () => {
      const intro = Array.isArray(entry.intro) ? entry.intro : [entry.intro];
      for (const s of intro)
        expect(typeof s).to.equal('string');
      const html = intro.join(' ');
      checkHtml(html);
    });
    const content = entry.content;

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
          expect(q).to.be.instanceof(Quest, 'A quest was generated');
          expect(q.cases.length).to.be.within(1, Infinity, 'At least 1 case');
        });
        if (!(q instanceof Quest))
          return;
        it('has title & description', () => {
          expect(typeof q.descr).to.equal('string');
          expect(typeof q.title).to.equal('string');
        });
        if (quest.solution) {
          it('passes included example solution', () => {
            const result = q.check(quest.solution);
            if (!result.pass) {
              console.log('proposed solution failed: ' + result.expr.expand().toString({terse: false}));
              for (const entry of result.details) {
                console.log("found:    " + entry.found);
                console.log("expected: " + entry.expected);
              }
            }
            expect(result.pass).to.equal(true);
          });
        }
        for (const wrong of quest.wrong ?? []) {
          it('fails on wrong solution: ' + wrong, () => {
            const result = q.check(wrong);
            expect(result.pass).to.equal(false);
            // TODO check error details but later
          });
        }
        it('has unique id', () => {
          const id = q.meta.id;
          expect(typeof id).to.equal('string');
          expect(id).to.match(/\S/);
          expect(uniqQuest.has(id)).to.equal(false, 'quest id is unique: ' + id);
          uniqQuest.add(id);
        });
      });
    }

  });
}

function checkHtml(text) {
  const tokenizer = new Tokenizer('</?[a-z][a-z_0-9]*[^>]*>', '[^<>&]+', '&[a-z_0-9#]+;');

  const tokens = tokenizer.split(text);
  const stack = [];
  for (const tok of tokens) {
    if (tok[0] === '<') {
      if (tok[1] === '/') {
        if (!stack.length)
          throw new Error('Unexpected closing tag: ' + tok);
        const tag = stack.pop();
        if ('</'+tag+'>' !== tok)
          throw new Error('Mismatched closing tag: ' + tok + ' vs ' + tag);
      } else {
        const match = tok.match(/^<([a-z][a-z_0-9]*)/);
        if (!match)
          throw new Error('Invalid tag: ' + tok);
        stack.push(match[1]);
      }
    }
  }
  if (stack.length)
    throw new Error('Unclosed tags: ' + stack.join(', '));
}

