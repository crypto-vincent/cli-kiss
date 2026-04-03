---
layout: home

hero:
  name: CLI-kiss
  text: CLI for TypeScript.

  tagline:
    Zero runtime dependencies.<br/>Typed commands, options, and
    positionals.<br/>Built-in --help, --version, and error output.

  image:
    src: /logo.png

  actions:
    - theme: brand
      text: Get Started
      link: /guide/01_getting_started
    - theme: alt
      text: View on GitHub
      link: https://github.com/crypto-vincent/cli-kiss

features:
  - title: Zero dependencies
    icon: 📦
    details: >
      No runtime dependencies. Pure TypeScript, ~5 kb minified. No supply-chain
      risk.
  - title: Fully typed
    icon: 🔷
    details: >
      Options and positionals infer their TypeScript types automatically.<br/>No
      manual type annotations needed.
  - title: Built-in output
    icon: 🖨️
    details: >
      "--help", "--version" and "--color" out of the box.<br/>Color-aware error
      messages.
  - title: Error suggestions
    icon: 💡
    details: >
      Helpful suggestions for typos in commands, options, and
      positionals.<br/>It's line inline help, but for errors.
  - title: Composable
    icon: 🧩
    details: >
      Leaf commands, named subcommands, and chained stages.<br/>Any CLI
      structure from the same small set of building blocks.
---
