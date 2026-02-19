class Store {
  constructor (namespace) {
    this.ns = namespace + ':';
  }

  save (key, value) {
    window.localStorage.setItem(this.ns + key, JSON.stringify(value));
  }

  load (key) {
    return JSON.parse(window.localStorage.getItem(this.ns + key));
  }

  scan () {
    const st = window.localStorage;
    const out = [];
    for (let i = 0; i < st.length; i++) {
      const key = st.key(i);
      if (key.startsWith(this.ns))
        out.push(key.substring(this.ns.length));
    }
    return out;
  }

  delete (key) {
    window.localStorage.removeItem(this.ns + key);
  }
}

module.exports = { Store };
