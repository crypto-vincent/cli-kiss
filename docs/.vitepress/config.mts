import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cli-kiss",
  description: "No bloat, no dependency, full-featured CLI command runner",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/cli-kiss",
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Commands", link: "/guide/commands" },
          { text: "Options", link: "/guide/options" },
          { text: "Positionals", link: "/guide/positionals" },
          { text: "Types", link: "/guide/types" },
          { text: "Running your CLI", link: "/guide/run" },
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
