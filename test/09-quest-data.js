const { expect } = require('chai');
const fs = require('node:fs').promises;
const path = require('node:path');

const { Tokenizer } = require('../src/internal');
const { SKI } = require('../index');
const { Quest } = SKI;

const dir = path.join(__dirname, '../docs/quest-data/');
const solutionsPath = path.join(__dirname, '../data/quest-solutions.json');

const uniqQuest = new Set();
const uniqChapter = new Set();

let questSolutions = {};

describe('quest-data', () => {
  before(async () => {
    questSolutions = await fs.readFile(solutionsPath)
      .then(data => JSON.parse(data));
  });

  it('has index', async () => {
    const index = await fs.readFile(path.join(dir, 'index.json'))
      .then(data => JSON.parse(data));

    expect(Array.isArray(index)).to.equal(true, 'index is an array');

    describe('index', () => {
      for (let n = 0; n < index.length; n++) {
        const entry = typeof index[n] === 'string' ? { link: index[n] } : index[n];
        it('entry ' + n + ' has quest file ' + entry.link, () => {
          expect(typeof entry.link).to.equal('string');
          return fs.readFile(path.join(dir, entry.link))
            .then(data => JSON.parse(data))
            .then(raw => {
              raw = Array.isArray(raw) ? { content: raw } : raw;
              const merged = { ...entry, ...raw };
              verifyChapter(merged, n);
            });
        });
      }
    });
  });
});

function verifyChapter (entry, n) {
  describe('chapter ' + n + ' ' + (entry.link ?? 'empty'), () => {
    it('has uniques id', () => {
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
        console.log(q.meta);
        it('has title', () => {
          expect(typeof q.name).to.equal('string');
        });
        it('has description', () => {
          expect(typeof q.intro).to.equal('string');
          checkHtml(q.intro);
        });
        it('has date', () => {
          const date = q.meta.created_at;
          expect(date).to.be.a('string');
          expect(new Date(date)).to.be.instanceof(Date);
          expect(new Date(date)).to.be.within(new Date('2024-07-15'), new Date());
        });

        it('has unique id', () => {
          const id = q.meta.id;
          expect(typeof id).to.equal('string');
          expect(id).to.match(/\S/);
          expect(uniqQuest.has(id)).to.equal(false, 'quest id is unique: ' + id);
          uniqQuest.add(id);
        });

        it('passes passing and fails failing solutions, if given', () => {
          const nope = q.verifySolutions(questSolutions);
          if (nope !== null) {
            // if selfCheck returns _anything_, produce a valid expected/actual diff;
            // but then fail anyway, because an empty object is also wrong.
            expect(SKI.extras.deepFormat(nope)).to.deep.equal({});
            expect(nope).to.equal(null);
          }
        });
      });
    }
  });
}

function checkHtml (text) {
  const tokenizer = new Tokenizer('</?[a-z][a-z_0-9]*[^>]*>', '[^<>&]+', '&[A-Za-z_0-9#]+;');

  const tokens = tokenizer.split(text);
  const stack = [];
  for (const tok of tokens) {
    if (tok[0] === '<') {
      if (tok[1] === '/') {
        if (!stack.length)
          throw new Error('Unexpected closing tag: ' + tok);
        const tag = stack.pop();
        if ('</' + tag + '>' !== tok)
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
