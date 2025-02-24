/**
 *   HTML-related utility functions. Poor man's jquery & react.
 */

/**
 * Locate static element with specific ids and return a hash of them.
 * @param {String} ids
 * @return {{}}
 */
function grabView (...ids) {
    const view = {};
    for (const name of ids)
        view[name] = document.getElementById(name);
    return view;
}

/**
 * Attach a child element to the given parent and return the child.
 * @param parent
 * @param type
 * @param {{class: string[]?, content: string?, hidden: boolean?}} options
 * @return {HTMLElement}
 */
function append(parent, type, options={}) {
    const child = document.createElement(type);
    if (options.class)
        child.classList.add(...options.class);
    if (options.content !== undefined)
        child.innerHTML = '' + options.content;
    if (options.hidden)
        child.hidden = true;
    if (options.color)
        child.style.color = options.color;
    parent.appendChild(child);
    return child;
}

function rubberDesign (mainId) {
    let target;
    const other = [];
    for (const child of document.body.children) {
        if (child.id === mainId)
            target = child;
        else
            other.push(child);
    }

    if (!target)
        throw new Error("Failed to find main element with id "+mainId)

    const resize = () => {
        const height = other.reduce( (acc, el) => acc+el.offsetHeight, 0);
        target.style.height = (window.innerHeight - height) + 'px';
        return true;
    }

    window.addEventListener('resize', resize);
    resize();
    return resize;
}

/**
 *
 * @param {Element} element
 * @param {boolean} visible
 */
function showhide(element, visible=false) {
    element.hidden = !visible;
}

function getParams() {
    // Somewhat ad hoc but it's javascript ^_^
    const raw = window.location.search.substring(1) || '';
    const out = {};
    raw.split('&').forEach( pair => {
        const [ name, value ] = pair.split('=');
        if (value === undefined) return; // TODO die
        out[name] = decode(value);
    })
    return out;
}

function encode (s) {
    // FB and possibly others don't recognize '(' and ')' in URLs,
    // so have to encode these chars correctly
    const parens = {
        '(': '%28',
        ')': '%29',
    }
    return encodeURIComponent(s).replace(/[()]/g, c => parens[c]);
}
function decode (s) {
    return decodeURIComponent((''+s).replace(/\+/g, ' '));
}

class TeletypeBox {
    /**
     *
     * @param {Element} parent
     * @param {{height: number?}} options
     */

    constructor (parent, options={}) {
        this.parent = parent;
        this.options = options;
        this.content = append(parent, 'div', {class: ['console']});
        this.head = append(this.content, 'div', {class: ['con-header']});
        this.box = append(this.content, 'div', {class: ['eval-box']});
        this.foot = append(this.content, 'div', {class: ['con-footer']});
        this.height = options.height ?? Infinity;
    };
    print (text, options={}) {
        const line = append(this.box, 'div', options);
        this.last = line;

        if (options.raw) {
            line.innerHTML = text;
        } else {
            writeElement(append(line, 'span', {class: ["line-number"]}), options.line ?? '');
            writeElement(append(line, 'span', {
                class: options.class ?? ["line-text"],
                color: options.color,
            }), text);

            while (this.box.children.length > this.height)
                this.box.removeChild(this.box.firstChild);
        }

        this.parent.scrollTop = line.offsetTop;

        return line;
    }

    remove() {
        if (this.parent) {
            this.parent.removeChild(this.content);
            this.parent = null;
        }
    }

    attach(parent) {
        this.parent = parent;
        parent.appendChild(this.content);
    }
}

function writeElement (element, text) {
    // make text safe for HTML
    element.innerHTML = sanitize(text);
    return element;
}

function sanitize (text) {
    if (typeof text !== 'string')
        text = ''+text;
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class Store {
    constructor(namespace) {
        this.ns = namespace + ':';
    }

    save(key, value) {
        window.localStorage.setItem(this.ns + key, JSON.stringify(value));
    }

    load(key) {
        return JSON.parse(window.localStorage.getItem(this.ns + key));
    }

    scan() {
        const st = window.localStorage;
        const out = [];
        for (let i = 0; i < st.length; i++) {
            const key = st.key(i);
            if (key.startsWith(this.ns))
                out.push(key.substring(this.ns.length));
        }
        return out;
    }

    delete(key) {
        window.localStorage.removeItem(this.ns + key);
    }
}
