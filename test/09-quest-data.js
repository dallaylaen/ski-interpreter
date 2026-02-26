/**
 * @desc Tests the quest data in docs/quest-data, ensuring it can be loaded and verified without errors.
 *       Also checks for unique quest and chapter IDs, and that all quests have titles, descriptions, and valid dates.
 *       If quest-solutions.json is present, also verifies that quests pass their expected solutions.
 *
 *       Mostly written by Claude Haiku 4.5.
 */

const { expect } = require('chai');
const fs = require('node:fs').promises;
const path = require('node:path');

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
    let group, err;
    try {
      group = new Quest.Group(entry);
    } catch (e) {
      err = e;
    }

    it('is a quest group', () => {
      if (err)
        throw err;
      expect(group).to.be.instanceof(Quest.Group, 'A Quest.Group was generated');
      expect(Array.isArray(group.content)).to.equal(true, 'Content is an array');
    });

    if (!(group instanceof Quest.Group))
      return;

    it('has unique chapter id', () => {
      expect(entry.id).to.be.a('string');
      expect(uniqChapter.has(entry.id)).to.equal(false, 'chapter id is unique: ' + entry.id);
      uniqChapter.add(entry.id);
    });

    it('has title', () => {
      expect(typeof group.name).to.equal('string');
    });

    it('has description', () => {
      expect(typeof group.intro).to.equal('string');
    });

    it('passes group verify() checks', () => {
      const seenIds = new Set();
      const findings = group.verify({
        date:      true,
        solutions: questSolutions,
        seen:      seenIds
      });

      // Filter out nulls from content array - they represent quests with no errors
      const contentErrors = findings.content?.filter(item => item !== null);
      const hasContentErrors = contentErrors && contentErrors.length > 0;
      const hasOtherErrors = Object.keys(findings).some(key => key !== 'content' && findings[key]);

      if (hasOtherErrors || hasContentErrors) {
        // Format findings for better error display
        const formatted = SKI.extras.deepFormat(findings);
        expect(formatted).to.deep.equal({}, 'All group verification checks should pass');
      }
    });

    // Detailed tests for each quest in the group
    for (let i = 0; i < group.content.length; i++) {
      const q = group.content[i];
      describe('quest ' + entry.link + ' [' + i + '] ' + q.id, async () => {
        it('is a quest', () => {
          expect(q).to.be.instanceof(Quest, 'A quest was generated');
          expect(q.cases.length).to.be.within(1, Infinity, 'At least 1 case');
        });

        it('has title', () => {
          expect(typeof q.name).to.equal('string');
        });

        it('has description', () => {
          expect(typeof q.intro).to.equal('string');
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

        it('passes quest verify() checks', () => {
          const findings = q.verify({
            date:      true,
            solutions: questSolutions
          });
          expect(findings).to.equal(null, 'Quest should pass all verification checks');
        });

        it('passes passing and fails failing solutions, if given', () => {
          const nope = q.verifySolutions(questSolutions);
          if (nope !== null) {
            // if verifySolutions returns _anything_, produce a valid expected/actual diff;
            // but then fail anyway, because an empty object is also wrong.
            expect(SKI.extras.deepFormat(nope)).to.deep.equal({});
            expect(nope).to.equal(null);
          }
        });
      });
    }
  });
}
