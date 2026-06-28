import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { glob as tGlob } from "tinyglobby";
import { ALLOWED_CLASSES } from "./daisyui-classes.ts";

const FILE_PATTERNS = [
  "**/*.{html,vue,jsx,tsx,js,ts,mjs,cjs,svelte,astro,mdx,css,pcss,scss,sass,less}",
];
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/coverage/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/build/**",
];

const CLASS_HELPERS = ["clsx", "classnames", "cn"];

function splitClassValue(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractStringLiterals(text: string): string[] {
  const values: string[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      let escaped = false;
      let value = "";
      i++;

      while (i < text.length) {
        const current = text[i];

        if (escaped) {
          value += current;
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === quote) {
          break;
        } else {
          value += current;
        }

        i++;
      }

      values.push(value);
    }

    i++;
  }

  return values;
}

function readQuotedString(text: string, startIndex: number): string | null {
  const quote = text[startIndex];
  if (!quote || (quote !== '"' && quote !== "'" && quote !== "`")) {
    return null;
  }

  let escaped = false;
  let endIndex = startIndex + 1;
  let value = "";

  while (endIndex < text.length) {
    const current = text[endIndex];

    if (escaped) {
      value += current;
      escaped = false;
    } else if (current === "\\") {
      escaped = true;
    } else if (current === quote) {
      return value;
    } else {
      value += current;
    }

    endIndex++;
  }

  return null;
}

function readBalancedBlock(
  text: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
): { value: string; endIndex: number } | null {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const current = text[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === quote) {
        quote = null;
      }
      continue;
    }

    if (current === '"' || current === "'" || current === "`") {
      quote = current;
      continue;
    }

    if (current === openChar) {
      depth++;
    } else if (current === closeChar) {
      depth--;
      if (depth === 0) {
        return {
          value: text.slice(startIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }

  return null;
}

function addClassesFromText(text: string, target: Set<string>) {
  const literals = extractStringLiterals(text);
  const sources = literals.length > 0 ? literals : [text];

  for (const source of sources) {
    for (const token of splitClassValue(source)) {
      if (token) {
        target.add(token);
      }
    }
  }
}

function extractClasses(content: string): string[] {
  const classes = new Set<string>();

  const addFromValue = (value: string) => addClassesFromText(value, classes);

  // 1) class="..." / className="..." / :class="..."
  const attributeRegex = /\b(?:class|className|:class)\s*=\s*/g;
  let match: RegExpExecArray | null;

  while ((match = attributeRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;
    const nextChar = content[startIndex];

    if (nextChar === '"' || nextChar === "'" || nextChar === "`") {
      const quoted = readQuotedString(content, startIndex);
      if (quoted !== null) {
        addFromValue(quoted);
      }
    } else if (nextChar === "{") {
      const block = readBalancedBlock(content, startIndex, "{", "}");
      if (block) {
        addFromValue(block.value);
      }
    }
  }

  // 2) element.className = "..." / element.className += "..."
  const classNameAssignmentRegex = /\.className\s*(?:\+)?=\s*/g;
  while ((match = classNameAssignmentRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;
    const nextChar = content[startIndex];

    if (nextChar === '"' || nextChar === "'" || nextChar === "`") {
      const quoted = readQuotedString(content, startIndex);
      if (quoted !== null) {
        addFromValue(quoted);
      }
    } else if (nextChar === "{") {
      const block = readBalancedBlock(content, startIndex, "{", "}");
      if (block) {
        addFromValue(block.value);
      }
    }
  }

  // 3) classList.add/remove/toggle/contains(...)
  const classListRegex = /\.classList\.(?:add|remove|toggle|contains)\s*\(\s*/g;
  while ((match = classListRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;
    const block = readBalancedBlock(content, startIndex, "(", ")");
    if (block) {
      addFromValue(block.value);
    }
  }

  // 4) clsx(...), classnames(...), cn(...)
  const helperRegex = new RegExp(`\\b(${CLASS_HELPERS.join("|")})\\s*\\(`, "g");
  while ((match = helperRegex.exec(content)) !== null) {
    const openParenIndex = content.indexOf("(", match.index);
    const block = readBalancedBlock(content, openParenIndex, "(", ")");
    if (block) {
      addFromValue(block.value);
    }
  }

  // 5) Svelte: class:foo={...}
  const svelteDirectiveRegex = /class:([a-zA-Z_][\w-]*)/g;
  while ((match = svelteDirectiveRegex.exec(content)) !== null) {
    const className = match[1];
    if (className) {
      classes.add(className);
    }
  }

  // 6) @apply ...; in CSS / PostCSS / Preprocessor
  const applyRegex = /@apply\s+([^;{\n}]+)/g;
  while ((match = applyRegex.exec(content)) !== null) {
    const applyValue = match[1];
    if (applyValue) {
      addFromValue(applyValue);
    }
  }

  return [...classes];
}

async function findClassesInProject(
  rootDir: string,
  mode: "include" | "exclude",
): Promise<string[]> {
  const resolvedRoot = resolve(rootDir);

  if (!existsSync(resolvedRoot)) {
    throw new Error(`Путь не существует: ${resolvedRoot}`);
  }

  const files = await tGlob(FILE_PATTERNS, {
    cwd: resolvedRoot,
    absolute: true,
    onlyFiles: true,
    ignore: IGNORE_PATTERNS,
  });

  const allFoundClasses = new Set<string>();

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const className of extractClasses(content)) {
      allFoundClasses.add(className);
    }
  }

  if (mode === "exclude") {
    return ALLOWED_CLASSES.filter((className) => !allFoundClasses.has(className)).sort();
  }

  return Array.from(allFoundClasses).filter((c) => ALLOWED_CLASSES.includes(c));
}

export { findClassesInProject };
