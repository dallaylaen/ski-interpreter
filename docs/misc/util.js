/**
 *   HTML-related utility functions. Poor man's jquery & react.
 */

/**
 *
 * @param parent
 * @param type
 * @return {HTMLElement}
 */
function append(parent, type, options={}) {
    const child = document.createElement(type);
    if (options.class)
        child.classList.add(...options.class);
    if (options.content !== undefined)
        child.innerHTML = '' + options.content;
    parent.appendChild(child);
    return child;
}

/**
 *
 * @param {Element} element
 * @param {boolean} visible
 */
function showhide(element, visible=false) {
    if (visible)
        element.classList.remove('hidden');
    else
        element.classList.add('hidden');
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

/**
 * create a function that takes text and appends it to specific region
 * in a specific <div>
 * @param {Element} attach
 * @param {Object} opt
 * @return {(function(string, Object?): void)}
 */
function teletype(attach, opt={}) {
    const sheet = append(attach, opt.tag ?? 'div');
    if (opt.color)
        sheet.style.color = opt.color;
    sheet.style.border = 'dotted 1px '+(opt.color ?? 'black');
    return function (text, opt={}) {
        const line = append(sheet, opt.tag ?? 'span');
        if (opt.color)
            line.style.color = opt.color;
        if (opt.bgcolor)
            line.style.background = opt.bgcolor;
        if (opt.padding)
            line.style.paddingLeft = line.style.paddingRight = opt.padding+"em";
        if (opt.class)
            line.classList.add(opt.class);
        line.rewrite = function(str) {
            this.innerHTML = ''+str;
            view.teletype.scrollTop = line.offsetTop;
            return this;
        }
        line.rewrite(text);
        if (!opt.nobr)
            append( sheet, 'br' );
        return line;
    }
}
