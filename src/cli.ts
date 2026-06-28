#!/usr/bin/env node
import { link as cLink } from "ansi-escapes";
import chalk from "chalk";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { ALLOWED_CLASSES, DAISYUI_VERSION } from "./daisyui-classes.ts";
import { findClassesInProject } from "./index.ts";

const argv = process.argv.slice(2);

const options: ParseArgsOptionsConfig = {
  version: { type: "boolean", short: "v" },
  "list-class": { type: "boolean", short: "l" },
  help: { type: "boolean", short: "h" },
  include: { type: "boolean", short: "i" },
};
const { values: args, positionals } = parseArgs({
  argv,
  options,
  allowPositionals: true,
  strict: false,
});

if (args.help) {
  console.log(`
Usage: exclude-daisyui [project-path] [options]

Options:
  -i, --include        List only the classes that are used
  -l, --list-class     List all daisyui classes
  -h, --help           Display this help message
  -v, --version        Display the version

`);
  process.exit(1);
}

if (args.version) {
  console.log(
    `DaisyUI class from: ${cLink(DAISYUI_VERSION, `https://github.com/saadeghi/daisyui/tree/v${DAISYUI_VERSION}`)}`,
  );
  console.log(`exclude-daisyui:    ${cLink(pkg.version, pkg.repository.url)}`);

  process.exit(1);
}

if (args["list-class"]) {
  console.log("DaisyUI classes:");
  console.log(ALLOWED_CLASSES.join(", "));
  process.exit(1);
}

(async () => {
  const projectRoot = positionals[0] || process.cwd();

  const mode = args.include ? "include" : "exclude";

  try {
    const missingClasses = await findClassesInProject(projectRoot, mode);
    const list = missingClasses.length > 0 ? missingClasses.join(", ") : "none";

    console.log(chalk.gray('@plugin "daisyui" {'));
    console.log(`  ${mode}: ${list};`);
    console.log(chalk.gray("}"));
    process.exit(0);
  } catch (error) {
    console.error(
      "Не удалось просканировать проект:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
})();
