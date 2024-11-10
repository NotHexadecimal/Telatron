const canvas = document.createElement('canvas');
const nextButton = document.querySelector('button.next');
const prevButton = document.querySelector('button.prev');
const img = document.querySelector('img');
const plate = document.querySelector('.plate');

const width = img.width;
const height = img.height;
canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext('2d');

// --- Constants ---
const epsilon = 1e-5;

// --- Seedable rng ---
const hash = (n) => Math.imul(n, 2654435761) >>> 0;
const prngInit = (seed) => {
  let n = hash(seed);
  return () => ((n = (16807 * n) % 2147483647)) / 2147483647;
};

let prng;

// --- Nodes implementation ---
const mod = (a, b) => ((a % b) + b) % b;
const lerp = (a, b, t) => (b - a) * t + a;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// --- Nodes map ---
const map = {
  vec: [
    { value: () => '[@, @, @]', args: ['num', 'num', 'num'] },
    { value: () => 'mix(@, @, @)', args: ['vec', 'vec', 'num'] }
  ],
  num: [
    { value: () => 'x', args: [] },
    { value: () => 'y', args: [] },
    { value: () => String(prng() * 2 - 1), args: [] },
    { value: () => '(@ + @)', args: ['num', 'num'] },
    { value: () => '(@ - @)', args: ['num', 'num'] },
    { value: () => '(@ * @)', args: ['num', 'num'] },
    { value: () => '(@ / @)', args: ['num', 'num'] },
    { value: () => 'mod(@, @)', args: ['num', 'num'] },
    { value: () => 'Math.sin(@)', args: ['num'] },
    { value: () => 'Math.sqrt(@)', args: ['num'] }
  ]
};

// --- Steps to terminal calculation ---
const stepsToTerminalCache = {};
const stepsToTerminalType = (type) => {
  if (typeof stepsToTerminalCache[type] === 'number') {
    return stepsToTerminalCache[type];
  }
  stepsToTerminalCache[type] = Infinity;
  return stepsToTerminalCache[type] = map[type].reduce((acc, node) => Math.min(acc, stepsToTerminalNode(node)), Infinity);
};

const stepsToTerminalNode = (node) => {
  return node.args.length ? node.args.reduce((acc, arg) => Math.max(acc, stepsToTerminalType(arg)), 0) + 1 : 0;
};

// --- Ast utils ---
const buildAst = (type = 'vec', maxDepth = 5) => {
  const candidates = map[type].filter(node => stepsToTerminalNode(node) < maxDepth);
  const nodeDescriptor = candidates[Math.floor(prng() * candidates.length)];
  let text = nodeDescriptor.value();
  for (const arg of nodeDescriptor.args.map((arg) => buildAst(arg, maxDepth - 1))) {
    text = text.replace('@', arg);
  }
  return text;
};

const buildFn = (ast) => {
  return new Function('x', 'y', `return ${ast};`);
};

const evaluate = (fn, x, y) => {
  const [r, g, b] = fn(x + epsilon, y + epsilon);
  return [Math.abs(r), Math.abs(g), Math.abs(b), 1];
};

// --- Draw utils ---
const draw = (ast) => {
  const array = new Uint8ClampedArray(width * height * 4);
  const fn = buildFn(ast);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < height; x++) {
      const index = (y * width + x) * 4;
      const [r, g, b, a] = evaluate(fn, (x / width) * 2 - 1, (y / height) * 2 - 1);
      array[index + 0] = r * 255;
      array[index + 1] = g * 255;
      array[index + 2] = b * 255;
      array[index + 3] = a * 255;
    }
  }
  const data = new ImageData(array, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(data, 0, 0);
};

// --- Main ---
const run = (n) => {
  prng = prngInit(n);
  const ast = buildAst();
  draw(ast);

  //console.log(ast);
  img.src = canvas.toDataURL();
  plate.innerHTML = String(n);
}

let i = 0;
run(i);
nextButton.addEventListener('click', () => run(++i));
prevButton.addEventListener('click', () => run(--i));

