# exclude-daisyui

CLI tool for analyzing a project and generating a list of DaisyUI classes that can be excluded from the DaisyUI plugin integration in Tailwind CSS.

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## What is it for

DaisyUI is a powerful set of components, but if you don’t use all the classes, including the entire set can increase the size of your final CSS file.
This tool helps you:

- find the DaisyUI classes that are actually used in your project;
- generate a ready-to-use section for `@plugin “daisyui”` in Tailwind;
- reduce the build size by excluding unused classes.

## How It Works

The CLI recursively scans the project files and attempts to find DaisyUI classes in the following file types:

По умолчанию сканируются файлы типа:
html, vue, jsx, tsx, js, ts, mjs, cjs, svelte, astro, mdx, css, pcss, scss, sass, less.

It looks for:

- the `class`, `className`, and `:class` attributes;
- expressions like `.className = ...`;
- `.classList.add/remove/toggle/contains(...)`;
- helper functions such as `clsx(...)`, `classnames(...)`, `cn(...)`;
- Svelte directives `class:...`;
- `@apply ...` in CSS.

By default, the tool outputs a list of DaisyUI classes that are not used in the project.
This is useful for the section:

```css
@plugin "daisyui" {
  exclude: ...;
}
```

If you pass the `--include` flag, it will instead show only the classes found in the project.

## Installation

```bash
npm install -g exclude-daisyui
```

Or use it directly via npx:

```bash
npx exclude-daisyui [project-path]
```

### Usage

```bash
npx exclude-daisyui [project-path] [options]
```

##### Options

```
-i, --include      List only the classes that are used
-l, --list-class   List all daisyui classes
-h, --help         Display this help message
-v, --version      Display the version
```

##### Examples

```bash
npx exclude-daisyui .
npx exclude-daisyui ./src
npx exclude-daisyui ./src --include
npx exclude-daisyui --list-class
```

##### Output example

```css
@plugin "daisyui" {
  exclude: alert, badge, button;
}
```

##### Supported Files

The following file extensions are scanned:
`html`, `vue`, `jsx`, `tsx`, `js`, `ts`, `mjs`, `cjs`, `svelte`, `astro`, `mdx`, `css`, `pcss`, `scss`, `sass`, `less`.

The following standard directories are excluded:
`node_modules`, `dist`, `.git`, `coverage`, `.next`, `.nuxt`, `build`.

This helps reduce the size of the stylesheets if the application uses only a subset of DaisyUI’s features.

#### Limitations

The tool is quite smart, but not perfect:

- it cannot always correctly recognize dynamically generated classes;
- it does not analyze all possible patterns in the code;
- it cannot “guess” classes that appear through calculations at runtime.

> [!IMPORTANT]
> Therefore, it’s best to use the result as a guideline rather than as absolute truth.

#### When It’s Especially Useful

This tool is especially useful if you:

- use DaisyUI in a large project;
- want to reduce the size of your CSS;
- don’t want to manually list all classes;
- work with Tailwind + DaisyUI and want to automate optimization.

#### Note

- The list of classes is based on the version of DaisyUI used in the current build (5.6.3).
- If you’ve updated DaisyUI to a different version, the list may need to be updated.

## Development

<details>

<summary>local development</summary>

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## License

[MIT][license-href]. Made with 💛

[npm-version-src]: https://img.shields.io/npm/v/exclude-daisyui?style=flat&colorA=18181B&colorB=fbd38d
[npm-version-href]: https://npmjs.com/package/exclude-daisyui
[npm-downloads-src]: https://img.shields.io/npm/dm/exclude-daisyui?style=flat&colorA=18181B&colorB=fbd38d
[npm-downloads-href]: https://npmjs.com/package/exclude-daisyui
[license-src]: https://img.shields.io/github/license/unmilley/exclude-daisyui.svg?style=flat&colorA=18181B&colorB=fbd38d
[license-href]: https://github.com/unmilley/exclude-daisyui/blob/main/LICENSE
