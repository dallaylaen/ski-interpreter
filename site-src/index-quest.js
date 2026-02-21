'use strict';

const { QuestBox, QuestChapter, QuestPage } = require('./quest');

if (typeof window !== 'undefined') {
  window.QuestBox = QuestBox;
  window.QuestChapter = QuestChapter;
  window.QuestPage = QuestPage;
}