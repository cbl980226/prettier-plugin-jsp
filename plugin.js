const { parsers } = require("prettier/parser-html");
const {
  printer: { printDocToString },
} = require("prettier").doc;

const ESCAPE_TOKEN = "____";

const parser = {
  ...parsers.html,
  astFormat: "jsp",
  preprocess: (text) => {
    return text
      .replace(/<%@([\w\W]+?)%>/g, "<JSP $1 />")
      .replace(/<%--([\w\W]+?)--%>/g, "<!-- $1 -->")
      .replace(/<(\s*\/\s*)?(\w+):(\w)/g, `<$1$2${ESCAPE_TOKEN}$3`);
  },
};

const getPrinter = (options) => {
  const plugin = options.plugins.find((p) => p.parsers?.html);
  return plugin.printers.html;
};

/**
 * @type {import('prettier').Plugin}
 */
const plugin = {
  languages: [
    {
      name: "Java Server Pages",
      parsers: ["jsp"],
      tmScope: "text.html.jsp",
      aceMode: "jsp",
      codemirrorMode: "htmlembedded",
      codemirrorMimeType: "application/x-jsp",
      extensions: [".jsp", ".tag"],
      linguistLanguageId: 182,
      vscodeLanguageIds: ["jsp"],
    },
  ],
  parsers: {
    jsp: parser,
  },
  printers: {
    jsp: {
      preprocess: (ast, options) => {
        return getPrinter(options).preprocess(ast, options);
      },
      insertPragma: (text) => {
        return "<!-- @format -->\n\n" + text.replace(/^\s*\n/, "");
      },
      embed: (path, print, textToDoc, options) => {
        return getPrinter(options).embed(path, print, textToDoc, options);
      },
      print: (path, options, print) => {
        const node = path.getValue();
        if (node.type === "element" && node.name === "JSP") {
          const res = getPrinter(options).print(path, options, print);
          const txt = printDocToString(res, {
            ...options,
            printWidth: Infinity,
          }).formatted;
          return txt.replace(/^<JSP/, "<%@").replace(/\/>$/, "%>");
        } else if (node.type === "comment") {
          return `<%-- ${node.value.trim()} --%>`;
        } else {
          if (node.type === "element" && node.name.includes(ESCAPE_TOKEN)) {
            node.name = node.name.replace(ESCAPE_TOKEN, ":");
          }
          return getPrinter(options).print(path, options, print);
        }
      },
    },
  },
};

module.exports = plugin;
