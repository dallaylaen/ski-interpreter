import TinyQueue from 'tinyqueue';
import { Alias, Expr, InferOptions, TermInfo } from './expr';

import { ScoringWeights, SearchCallback, SearchProgress, SearchOptions, SearchCallbackResult } from './extras';

type QueueEntry = {
  expr: Expr,
  props: TermInfo,
  score: number,
};

const WEIGHTS: Required<ScoringWeights> = {
  normal:        -5,
  proper:        -2,
  duplicate:     5,
  discard:       0,
  arity:         0.1,
  size:          2,
  canonicalSize: 0.3,
  steps:         0.01,
};

export function * search2<T> (seed: Expr[], options: SearchOptions, predicate: SearchCallback<T>): Generator<SearchProgress<T>> {
  const weights = { ...WEIGHTS, ...options.weights };
  const infer: InferOptions = { max: options.max, maxArgs: options.maxArgs, maxSize: options.maxSize };
  const progressInterval = options.progressInterval ?? 1000;

  // search state
  const queue: TinyQueue<QueueEntry> = new TinyQueue([], (a: QueueEntry, b: QueueEntry) => a.score - b.score);
  const seen = new Set<string>();
  const terms: Expr[] = [];

  // search progress meter
  let total = 0;
  let probed = 0;
  let lastGen = 1;
  let lastProgress = 0;

  function yieldMe<T> (expr: Expr, got: SearchCallbackResult<T>, gen: number): SearchProgress<T> {
    const newGen = gen > lastGen;
    if (newGen)
      lastGen = gen;
    return {
      ...(got.found !== undefined ? { expr, found: got.found } : {}),
      ...(got.stop !== undefined ? { stop: got.stop } : {}),
      total,
      probed,
      gen:   lastGen,
      newGen,
      cache: { terms, queue },
    };
  }

  const push = (expr: Expr): SearchCallbackResult<T> & { score?: number } => {
    // console.log('Trying expr = ' + expr);

    total++;
    if (expr.size > (options.depth ?? Infinity))
      return {};
    const props = expr.infer(infer);
    if (!options.noskip && props.expr && seen.has(props.expr + ''))
      return {};
    seen.add(props.expr + '');
    let got = predicate(expr, props);
    probed++;
    if (typeof got !== 'object')
      got = { offset: got ?? 0 };
    if ((got.offset ?? 0) < 0)
      return {};
    const score = getWeight(expr, props, weights) + (got.offset ?? 0);
    // console.log(`Score of ${expr} = ${score}`);
    queue.push({ expr, props, score });
    return { ...got, score };
  }

  for (const expr of seed) {
    const got = push(expr);
    if (got.found !== undefined || got.stop)
      yield yieldMe(expr, got, 0);
    if (got.stop)
      return;
  }

  while (queue.length) {
    const next = queue.pop()!;

    // console.log(`Fetched ${next.expr} with score = ${next.score}`);

    // now add all possible combinations of new+old to the queue
    for (const expr of [
      ...terms.map(x => x.apply(next.expr)),
      ...terms.map(x => next.expr.apply(x)),
      next.expr.apply(next.expr)]) {
      const got = push(expr);
      const gen = Math.floor(got.score ?? 0);
      if (got.found !== undefined || gen > lastGen || total > lastProgress + progressInterval) {
        yield yieldMe(expr, got, expr.size);
        lastProgress = total;
      }
    }

    terms.push(next.expr);
  }

  // exhausted
  yield yieldMe(null!, { stop: true }, 0);
}

function getWeight (expr: Expr, props: TermInfo, weights: Required<ScoringWeights>) {
  return expr.size * 2 ** ((
    (props.normal && !!props.expr ? 0 : -weights.normal)
      + (props.proper ? 0 : -weights.proper)
      + (props.duplicate ? weights.duplicate : 0)
      + (props.discard ? weights.discard : 0)
      + (props.arity ?? 0) * weights.arity
      + (props.expr?.size ?? 0) * weights.canonicalSize
      + (props.steps ?? 0) * weights.steps
  ) / 10);
}
