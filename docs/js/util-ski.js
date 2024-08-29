/*
 *  Common functions related to SKI and not to just HTML.
 */


function permalink(engine, sample) {
    const terms = engine.getTerms();
    const saved = Object.keys(terms)
        .filter(name => !(terms[name] instanceof SKI.classes.Native))
        .map(name => name+':'+terms[name].expand()).join(',');
    return '?code=' + encode(sample) + '&terms=' + encode(saved);
}

function backupEngine(ski, pagename="index") {
    window.localStorage.setItem(pagename + '-ski-engine', JSON.stringify(ski));
}

function restoreEngine(pagename="index") {
    return new SKI(JSON.parse(window.localStorage.getItem(pagename + '-ski-engine') ?? '{}' ));
}
