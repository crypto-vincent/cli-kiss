import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cli-kiss",
  description: "No bloat, no dependency, full-featured CLI command runner",
  base: "/cli-kiss/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/01_getting_started" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/cli-kiss",
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/01_getting_started" },
          { text: "Commands", link: "/guide/02_commands" },
          { text: "Options", link: "/guide/03_options" },
          { text: "Positionals", link: "/guide/04_positionals" },
          { text: "Types", link: "/guide/05_types" },
          { text: "Running your CLI", link: "/guide/06_run" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/crypto-vincent/cli-kiss",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
    },
  },
});
