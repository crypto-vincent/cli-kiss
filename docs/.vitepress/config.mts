import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cli-kiss",
  description: "No bloat, no dependency, full-featured CLI command runner",
  base: "/cli-kiss/",

  themeConfig: {
    logo: "⚡",
    siteTitle: "cli-kiss",

    nav: [
      { text: "Home", link: "/" },
      { text: "Cookbook", link: "/cookbook/01-hello-world" },
      {
        text: "GitHub",
        link: "https://github.com/crypto-vincent/cli-kiss",
      },
    ],

    sidebar: [
      {
        text: "Cookbook",
        items: [
          { text: "1. Hello, World!", link: "/cookbook/01-hello-world" },
          { text: "2. Version Flag", link: "/cookbook/02-version-flag" },
          { text: "3. Boolean Flags", link: "/cookbook/03-boolean-flags" },
          {
            text: "4. Single-Value Options",
            link: "/cookbook/04-single-value-options",
          },
          {
            text: "5. Repeatable Options",
            link: "/cookbook/05-repeatable-options",
          },
          {
            text: "6. Required Positionals",
            link: "/cookbook/06-required-positionals",
          },
          {
            text: "7. Optional Positionals",
            link: "/cookbook/07-optional-positionals",
          },
          {
            text: "8. Variadic Positionals",
            link: "/cookbook/08-variadic-positionals",
          },
          { text: "9. Built-in Types", link: "/cookbook/09-built-in-types" },
          { text: "10. Enum Types", link: "/cookbook/10-enum-types" },
          { text: "11. Custom Types", link: "/cookbook/11-custom-types" },
          {
            text: "12. Delimited Lists",
            link: "/cookbook/12-delimited-lists",
          },
          {
            text: "13. Fixed-Length Tuples",
            link: "/cookbook/13-fixed-length-tuples",
          },
          { text: "14. Subcommands", link: "/cookbook/14-subcommands" },
          {
            text: "15. Chained Commands",
            link: "/cookbook/15-chained-commands",
          },
          {
            text: "16. Passing Context",
            link: "/cookbook/16-passing-context",
          },
          { text: "17. Testing Your CLI", link: "/cookbook/17-testing" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/crypto-vincent/cli-kiss" },
    ],

    footer: {
      message:
        'Built from <a href="https://github.com/crypto-vincent/cli-kiss/blob/main/COOKBOOK.md">COOKBOOK.md</a>',
      copyright: "cli-kiss — no bloat, no dependency, full-featured",
    },

    search: {
      provider: "local",
    },
  },
});
