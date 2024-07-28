function getQuests () {
    return [
        [
            {title: 'Uroboros', descr: 'Make a combinator that applies its argument to itself: x -> x x'},
            ['x x', 'x'],
        ],
        [
            {title: 'Mirror image', descr: 'Make a combinator that swaps its two arguments, that is, (x y) -> y x'},
            [ 'y x', 'x', 'y'],
        ],
        [
            {
                title: 'Lost identity',
                descr: 'Someone has dropped the I combinator from your interpreter. You have to rebuild it from the remaining two!',
                allow: 'SK',
            },
            [ 'x', 'x'],
        ],
        [
            {title: "if (then) (else) (true|false)"},
            [ 'x', 'x', 'y', 'K'],
            [ 'y', 'x', 'y', 'KI'],
        ],
    ]
}
