'use strict';

const { append } = require('./html-util');

let currentHamburger = null;

class Hamburger {
  constructor (button, options = {}) {
    this.button = button;
    button.classList.add('hamburger-button');
    this.parent = button.parentElement;
    this.hidden = true;
    this.content = append(this.parent, 'ul', { class: options.right ? ['hamburger', 'hamburger-right'] : ['hamburger'] });
    this.button.addEventListener('click', () => this.toggle());
  }

  appendLi () {
    return append(this.content, 'li');
  }

  addSeparator () {
    const li = this.appendLi();
    li.classList.add('hamburger-separator');
    return this; // for chaining
  }

  addLabel (label) {
    const li = this.appendLi();
    append(li, 'span', { content: label });
    return this; // for chaining
  }

  addLink (label, href, target) {
    if (target === '_blank')
      label = label + ' ' + '&#x1F517;';

    const li = this.appendLi();
    const link = append(li, 'a', { content: label });
    link.href = href;
    link.target = target;
    link.onclick = () => { this.hide(); return true };
    return this; // for chaining
  }

  addAction (label, action) {
    const li = this.appendLi();
    const link = append(li, 'a', { content: label });
    link.onclick = () => {
      action();
      this.hide();
    };
    return this; // for chaining
  }

  /**
   * A sticky options choice
   * @param label
   * @param action
   * @param choices
   * @return {Hamburger}
   */
  addChoice (label, smctl, choices ) {
    const li = this.appendLi();
    append(li, 'span', { content: label });
    const buttons = {}; // option value -> element
    for (const entry of choices) {
      const value = Array.isArray(entry) ? entry[1] : entry;
      const display = Array.isArray(entry) ? entry[0] : entry;
      const button = append(li, 'a', { content: display, class: ['hamburger-choice'] });
      buttons[value] = button;
      button.onclick = () => {
        smctl.set(value);
        this.hide();
      };
    }
    const action = (val, old) => {
      if (old !== undefined && buttons[old])
        buttons[old].classList.remove('hamburger-current');
      if (buttons[val])
        buttons[val].classList.add('hamburger-current');
    };
    smctl.addAction(action);
    action(smctl.get(), undefined);
    return this; // for chaining
  }

  // flags: [ [label, callback, selected?], ... ]
  addFlags(label, flags) {
    const state = {};
    const li = this.appendLi();
    append(li, 'span', { content: label });
    for (const [label, smctl] of flags) {
      const button = append(li, 'a', { content: label, class: ['hamburger-choice'] });
      button.onclick = () => {
        smctl.set(!smctl.get());
        this.hide();
      };
      const action = (val, old) => {
        button.classList.toggle('hamburger-current', val);
      };
      smctl.addAction(action);
      action(smctl.get());
    }
    return this; // for chaining
  }

  hide () {
    if (currentHamburger === this)
      currentHamburger = null;
    this.hidden = true;
    this.content.style.display = 'none';
    return false;
  }

  show () {
    if(currentHamburger)
      currentHamburger.hide();
    currentHamburger = this;
    this.hidden = false;
    this.content.style.display = 'block';
    // TODO close on outside click or escape
    return false;
  }

  toggle () {
    this.hidden ? this.show() : this.hide();
    return false;
  }
}

module.exports = { Hamburger };