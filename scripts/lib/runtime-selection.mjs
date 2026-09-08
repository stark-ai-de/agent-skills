// Package scripts use a small, static shell grammar. Reject syntax we cannot
// classify instead of attributing every child command to its shell wrapper.
function shellCommands(expression) {
  const commands = [];
  let words = [];
  let word = "";
  let started = false;
  let quote = null;
  const finishWord = () => {
    if (started) words.push(word);
    word = "";
    started = false;
  };
  const finishCommand = () => {
    finishWord();
    if (words.length) commands.push(words);
    words = [];
  };
  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (character === "\\" && quote !== "'") {
      if (index + 1 === expression.length) throw new Error("unfinished shell escape");
      word += expression[++index];
      started = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else {
        if (quote === '"' && /[$`]/.test(character)) {
          throw new Error("dynamic shell expansion has no statically selected runtime");
        }
        word += character;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
      started = true;
    } else if (/[;|&\n]/.test(character)) {
      finishCommand();
    } else if (/\s/.test(character)) {
      finishWord();
    } else if (/[$`()<>]/.test(character)) {
      throw new Error("unsupported shell syntax has no statically selected runtime");
    } else {
      word += character;
      started = true;
    }
  }
  if (quote) throw new Error("unfinished shell quote");
  finishCommand();
  if (!commands.length) throw new Error("empty shell expression");
  return commands;
}

export function packageCommandRuntimes(expression, scripts) {
  const runtimes = new Set();
  for (const words of shellCommands(expression)) {
    while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? "")) words.shift();
    const [executable, option, argument] = words;
    const bunArguments = option === "--bun" ? words.slice(2) : words.slice(1);
    if (executable === "bun" && bunArguments[0] === "exec") {
      if (bunArguments.length !== 2) throw new Error("bun exec requires one static expression");
      runtimes.add("bun");
      for (const runtime of packageCommandRuntimes(bunArguments[1], scripts)) runtimes.add(runtime);
    } else if (executable === "bun" && option === "--bun" && argument) {
      runtimes.add("bun");
    } else if (executable === "node" && option) {
      runtimes.add("node");
    } else if (executable === "oxfmt" || executable === "oxlint") {
      runtimes.add("native");
    } else if (executable === "pnpm" && option === "run" && Object.hasOwn(scripts, argument)) {
      // The referenced script is discovered separately under its owning boundary.
      // Its documented Node/native fallback does not change the Bun shell owner.
    } else {
      throw new Error(`unclassified runtime command: ${words.join(" ")}`);
    }
  }
  return [...runtimes];
}

export function runtimeAlignmentErrors(boundaries, occurrences) {
  const owners = new Map();
  for (const boundary of boundaries) {
    for (const surface of boundary.surfaces ?? []) owners.set(surface, boundary);
  }
  return occurrences.flatMap(({ source, surface, runtime }) => {
    const owner = owners.get(surface);
    if (!owner) return [`${source}: no matrix owner for ${surface}`];
    if (!runtime || runtime !== owner.winner) {
      return [
        `${source}: selected runtime ${runtime ?? "unknown"} disagrees with ${owner.id} winner ${owner.winner}`,
      ];
    }
    return [];
  });
}
