function getQuests () {
    return [
        [
            {
                title: 'Ignore all previous instructions',
                descr: `The <b>K</b> combinator takes 2 arguments, <i>x</i> and <i>y</i>,
                    and returns the first of them. You need to return the second one instead.

                `
            },
            ['y', 'x', 'y']
        ],
        [
            {
                title: 'Look at yourself',
                descr: `In the realm of combinators, everything is a function.
                So, how do you apply a function to itself? I.e. x -> x(x)`
            },
            ['x x', 'x'],
        ],
        [
            {title: 'Mirror image', descr: 'Make a combinator that swaps its two arguments, that is, (x, y) -> y x'},
            [ 'y x', 'x', 'y'],
        ],
        [
            {
                title: 'Lost identity',
                descr: 'Someone stole the I combinator from your interpreter. You have to rebuild it from the remaining two!',
                allow: 'SK',
            },
            [ 'x', 'x'],
        ],
        [
            {
                title: "B combinator",
                descr: "x y z -> x(y(z))",
            },
            ['x(y z)', 'x', 'y', 'z'],
        ],
        [
            {
                title: 'K forte',
                descr: 'Sometimes returning x for any y is not enough. Return it twice: (x, y)->x x'
            },
            ['x x', 'x', 'y'],
        ],
        [
            {
                title: 'Quine',
                descr: 'Write an expression that produces itself when given any argument. Hint: the above quest may help!',
            },
            [ {feedInput: true}, 'I', 'x'],
            [ {feedInput: true}, 'I', 'x', 'y'],
        ],
        [
            {
                title: 'Boolean I',
                descr: 'K and KI terms may be interpreted as true and false, respectively, '+
                    'as (x) (then) (else) will return <i>then</i> for <B>K</B> and <i>else</i> for <b>KI</b>. '+
                    'Implement not (x)'
            },
            [ 'x', 'KI', 'x', 'y'],
            [ 'y', 'K', 'x', 'y'],
        ],
        [
            {
                title: 'Boolean II',
                descr: 'if (then) (else) (bool) = then/else, depending on bool.'
            },
            [ 'x', 'x', 'y', 'K'],
            [ 'y', 'x', 'y', 'KI'],
            [ 'y', 'x', 'y', 'SK'],
        ],
        [
            {
                title: 'Church of Numerals I',
                descr: 'Church numeral N is a function that converts x, y to x(...x(y)...), repeated N times. '+
                    '0 is (x, y)->y (i.e. same as false), 1 is I (I x y = x(y)). What is 2?',
            },
            [ 'x(x(y))', 'x', 'y'],
        ],
        [
            {
                title: "Church of Numerals II",
                descr: "Procure a term that increases given number by 1: inc N x y = x(...N+1 times(y)...). "+
                    "Hint: inc N x y == x (N x y).",
                numbers: true,
            },
            [ 'x y', 'KI', 'x', 'y' ],
            [ 'x y', 'SK', 'x', 'y' ],
            [ 'x (x y)', 'I', 'x', 'y'],
            [ '9 x y', '8', 'x', 'y'],
        ],
    ];

    // TODO quine requires special testing primitives
}
