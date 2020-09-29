import { assert as chaiAssert } from "chai";
import { parseMarkdown, parseMarkdownParagraph } from "../src/markdown";

const assert = {
  ...chaiAssert,
  deepEqual: (actual, expected, message) => {
    try {
      chaiAssert.deepEqual(actual, expected, message);
    } catch (e) {
      console.log(e, actual, expected);
      throw e;
    }
  },
};

describe("Markdown", () => {
  it("empty string", () => {
    assert.deepEqual(parseMarkdown("").toJS(), []);
  });

  it("text", () => {
    assert.deepEqual(parseMarkdownParagraph("Hello World!"), {
      type: "paragraph",
      content: [{ type: "text", value: "Hello World!" }],
    });
  });

  it("escaped text", () => {
    assert.deepEqual(parseMarkdown("\\# No Heading").toJS(), [
      { type: "paragraph", content: [{ type: "text", value: "# No Heading" }] },
    ]);
  });

  it("paragraphs", () => {
    assert.deepEqual(parseMarkdown("Paragraph A\n\nParagraph B").toJS(), [
      {
        type: "paragraph",
        content: [{ type: "text", value: "Paragraph A" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", value: "Paragraph B" }],
      },
    ]);
  });

  it("expanded section", () => {
    assert.deepEqual(
      parseMarkdown("^ sectionname\n    Section Content").toJS(),
      [
        {
          type: "section",
          name: "sectionname",
          collapse: false,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", value: "Section Content" }],
            },
          ],
        },
      ]
    );
  });

  it("collapsed section", () => {
    assert.deepEqual(
      parseMarkdown("_ sectionname\n    Section Content").toJS(),
      [
        {
          type: "section",
          name: "sectionname",
          collapse: true,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", value: "Section Content" }],
            },
          ],
        },
      ]
    );
  });

  it("invalid empty section", () => {
    assert.deepEqual(parseMarkdown("> section").toJS(), [
      { type: "paragraph", content: [{ type: "text", value: "> section" }] },
    ]);
  });

  it("paragraph after section", () => {
    assert.deepEqual(parseMarkdown("^ section\n    bla\nafter").toJS(), [
      {
        type: "section",
        name: "section",
        collapse: false,
        content: [
          { type: "paragraph", content: [{ type: "text", value: "bla" }] },
        ],
      },
      { type: "paragraph", content: [{ type: "text", value: "after" }] },
    ]);
  });

  it("HTTPs link", () => {
    assert.deepEqual(parseMarkdownParagraph("[[caption|https://ecosia.de]]"), {
      type: "paragraph",
      content: [
        { type: "link", content: "caption", address: "https://ecosia.de" },
      ],
    });
  });

  it("internal link to reference", () => {
    assert.deepEqual(
      parseMarkdownParagraph("[[caption|reference:pinker-enlightenment-now]]"),
      {
        type: "paragraph",
        content: [
          {
            type: "ref-link",
            content: "caption",
            path: "pinker-enlightenment-now",
          },
        ],
      }
    );
  });

  it("internal link to article", () => {
    assert.deepEqual(parseMarkdownParagraph("[[caption|article]]"), {
      type: "paragraph",
      content: [
        {
          type: "article-link",
          content: "caption",
          path: "article",
        },
      ],
    });
  });

  it("internal link to article with colon", () => {
    assert.deepEqual(
      parseMarkdownParagraph("[[caption|reference\\:article]]"),
      {
        type: "paragraph",
        content: [
          {
            type: "article-link",
            content: "caption",
            path: "reference:article",
          },
        ],
      }
    );
  });

  it("toggler link", () => {
    assert.deepEqual(parseMarkdownParagraph("[[caption|toggle:section]]"), {
      type: "paragraph",
      content: [
        { type: "toggler-link", content: "caption", targetId: "section" },
      ],
    });
  });

  it("link without |", () => {
    assert.deepEqual(parseMarkdownParagraph("[[caption]]"), {
      type: "paragraph",
      content: [{ type: "text", value: "[[caption]]" }],
    });
  });

  it("math (block)", () => {
    assert.deepEqual(parseMarkdownParagraph("$$ \\KaTeX $$"), {
      type: "paragraph",
      content: [{ type: "katex-block", tex: " \\KaTeX " }],
    });
  });

  it("math (inline)", () => {
    assert.deepEqual(parseMarkdownParagraph("$\\KaTeX$"), {
      type: "paragraph",
      content: [{ type: "katex-inline", tex: "\\KaTeX" }],
    });
  });

  it("text and link", () => {
    assert.deepEqual(
      parseMarkdownParagraph("Hello [[World!|https://example.org]]"),
      {
        type: "paragraph",
        content: [
          { type: "text", value: "Hello " },
          { type: "link", content: "World!", address: "https://example.org" },
        ],
      }
    );
  });

  it("link without ending brace", () => {
    assert.deepEqual(parseMarkdownParagraph("[[Caption|https://example.org"), {
      type: "paragraph",
      content: [{ type: "text", value: "[[Caption|https://example.org" }],
    });
  });

  it("text with inline math", () => {
    assert.deepEqual(parseMarkdownParagraph("This is $\\KaTeX$!"), {
      type: "paragraph",
      content: [
        { type: "text", value: "This is " },
        { type: "katex-inline", tex: "\\KaTeX" },
        { type: "text", value: "!" },
      ],
    });
  });

  it("italic text with containing asterisk", () => {
    assert.deepEqual(parseMarkdownParagraph("*\\**"), {
      type: "paragraph",
      content: [{ type: "italic", content: [{ type: "text", value: "*" }] }],
    });
  });

  it("table", () => {
    assert.deepEqual(parseMarkdown("|A|B|C|").toJS(), [
      {
        type: "table",
        head: [
          [{ type: "text", value: "A" }],
          [{ type: "text", value: "B" }],
          [{ type: "text", value: "C" }],
        ],
        body: [],
      },
    ]);
  });

  it("table with italic text", () => {
    assert.deepEqual(parseMarkdown("|*A*|").toJS(), [
      {
        type: "table",
        head: [[{ type: "italic", content: [{ type: "text", value: "A" }] }]],
        body: [],
      },
    ]);
  });

  it("table with incorrect italic text", () => {
    assert.deepEqual(parseMarkdown("|*A|").toJS(), [
      {
        type: "table",
        head: [[{ type: "text", value: "*A" }]],
        body: [],
      },
    ]);
  });
});
