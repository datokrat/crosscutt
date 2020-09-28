import { Map, List } from "immutable";

// ======= IMMUTABLE ZONE =======

export function parseMarkdown(markdown) {
  const lines = List(markdown.split("\n"));
  const paragraphLines = List([]);
  return parseLines(lines, paragraphLines);
}

function parseLines(inputLines, paragraphLines) {
  const followingElements =
    parseEnd(inputLines) ||
    parseHeadingAndRest(inputLines) ||
    parseSectionAndRest(inputLines) ||
    parseEmptyLineAndRest(inputLines);

  if (followingElements !== null) {
    if (paragraphLines.size === 0) {
      return followingElements;
    } else {
      const firstElement = Map(
        parseMarkdownParagraph(paragraphLines.join("\n"))
      );
      return followingElements.unshift(firstElement);
    }
  } else {
    const firstLine = inputLines.first();
    const remainingLines = inputLines.shift();

    return parseLines(remainingLines, paragraphLines.push(firstLine));
  }
}

function parseEmptyLineAndRest(inputLines) {
  if (inputLines.size === 0) {
    return null;
  }

  const firstLine = inputLines.first();
  const remainingLines = inputLines.shift();

  return firstLine.search(/^\s*$/g) !== -1
    ? parseLines(remainingLines, List([]))
    : null;
}

function parseEnd(inputLines) {
  return inputLines.size === 0 ? List([]) : null;
}

function parseHeadingAndRest(inputLines) {
  if (inputLines.size === 0) {
    return null;
  }

  const firstLine = inputLines.first();
  const remainingLines = inputLines.shift();

  if (!firstLine.startsWith("# ")) {
    return null;
  }

  return parseLines(remainingLines, List([])).unshift(
    Map({
      type: "heading-1",
      value: firstLine.slice(2),
    })
  );
}

function parseSectionAndRest(inputLines) {
  if (inputLines.size === 0) {
    return null;
  }

  const firstLine = inputLines.first();
  const remainingLines = inputLines.shift();

  if (!firstLine.startsWith("^ ") && !firstLine.startsWith("_ ")) {
    return null;
  }

  const collapse = firstLine.slice(0, 1) === "_";
  const sectionName = firstLine.slice(2);

  if (sectionName.length === 0) {
    return null;
  }

  const sectionLines = List([]);
  return parseSectionAndRestRec(
    sectionName,
    collapse,
    sectionLines,
    remainingLines
  );
}

function parseSectionAndRestRec(secName, collapse, secLines, inputLines) {
  let followingElements;
  if (inputLines.size > 0) {
    const nextLine = inputLines.first();
    const remainingLines = inputLines.shift();

    if (nextLine.startsWith("    ")) {
      return parseSectionAndRestRec(
        secName,
        collapse,
        secLines.push(nextLine.slice(4)),
        remainingLines
      );
    } else {
      followingElements = () => parseLines(inputLines, List([]));
    }
  } else {
    followingElements = () => List([]);
  }

  if (secLines.size === 0) {
    return null;
  } else {
    return followingElements().unshift(
      createSection(secName, collapse, secLines)
    );
  }
}

function createSection(name, collapse, lines) {
  return Map({
    type: "section",
    name: name,
    collapse: collapse,
    content: parseLines(lines, List([])),
  });
}

export function parseMarkdownParagraphContent(markdown) {
  const [item, rest] = parseParagraphContentUntil(markdown, /$/);
  return item;
}

function parseParagraphContentUntil(markdown, predicateRegex) {
  const startPredicateRegex = new RegExp("^" + predicateRegex.source, "");
  let rest = markdown;
  const result = [];
  let lastItem = null;
  let i = 0;
  while (rest.search(startPredicateRegex) === -1 && i < 2000) {
    ++i;
    let item;
    [item, rest] = parseNext(rest, predicateRegex);

    if (lastItem !== null) {
      if (lastItem.type === "text" && item.type === "text") {
        lastItem = {
          type: "text",
          value: lastItem.value + item.value,
        };
      } else {
        result.push(lastItem);
        lastItem = item;
      }
    } else {
      lastItem = item;
    }
  }

  if (rest.search(startPredicateRegex) === -1) {
    return [null, markdown];
  }

  if (lastItem !== null) {
    result.push(lastItem);
  }

  return [result, rest];
}

export function parseMarkdownParagraph(markdown) {
  return {
    type: "paragraph",
    content: parseMarkdownParagraphContent(markdown),
  };
}

export function parseNext(markdown, delimiterRegex) {
  return parseOptions(markdown, paragraphParsers(delimiterRegex));
}

function paragraphParsers(delimiterRegex) {
  return List([
    parseLeadingLink,
    parseLeadingKatexBlockFormula,
    parseLeadingKatexInlineFormula,
    parseLeadingBoldText,
    parseLeadingItalicText,
    (markdown) => parseLeadingText(markdown, delimiterRegex),
  ]);
}

function parseOptions(markdown, options) {
  for (let i = 0; i < options.size; ++i) {
    const [item, rest] = options.get(i)(markdown);
    if (item !== null) {
      return [item, rest];
    }
  }

  return [null, markdown];
}

export function parseLeadingText(markdown, delimiterRegex) {
  const additionalDelimiters =
    delimiterRegex !== undefined ? "(" + delimiterRegex.source + ")|" : "";
  const regex = new RegExp(
    additionalDelimiters + "(\\[\\[)|(\\*)|(_)|(\\$)|\\\\",
    ""
  );
  const endIndex = markdown.search(regex);
  if (markdown.length === 0) {
    return [null, markdown];
  }
  if (endIndex === -1) {
    return [{ type: "text", value: markdown }, ""];
  }
  if (markdown.startsWith("\\")) {
    return markdown.length >= 2
      ? [{ type: "text", value: markdown.slice(1, 2) }, markdown.slice(2)]
      : [{ type: "text", value: "\\" }, ""];
  }
  if (endIndex === 0) {
    return [{ type: "text", value: markdown.slice(0, 1) }, markdown.slice(1)];
  } else {
    return [
      { type: "text", value: markdown.slice(0, endIndex) },
      markdown.slice(endIndex),
    ];
  }
}

export function parseLeadingLink(markdown) {
  if (!markdown.startsWith("[[")) {
    return [null, markdown];
  }

  const endingBracePos = markdown.indexOf("]]");
  if (endingBracePos === -1) {
    return [null, markdown];
  }

  const betweenBraces = markdown.slice(2, endingBracePos);
  const relativeDelimiterPos = betweenBraces.indexOf("|");
  if (relativeDelimiterPos === -1) {
    return [null, markdown];
  }

  const caption = betweenBraces.slice(0, relativeDelimiterPos);
  const address = betweenBraces.slice(relativeDelimiterPos + 1);
  const rest = markdown.slice(endingBracePos + 2);

  if (address.startsWith("reference:")) {
    return [
      {
        type: "ref-link",
        content: caption,
        path: address.slice("reference:".length),
      },
      rest,
    ];
  } else if (address.startsWith("toggle:")) {
    return [
      {
        type: "toggler-link",
        content: caption,
        targetId: address.slice("toggle:".length),
      },
      rest,
    ];
  } else if (address.startsWith("http://") || address.startsWith("https://")) {
    return [{ type: "link", content: caption, address: address }, rest];
  } else {
    return [
      { type: "article-link", content: caption, path: unescape(address) },
      rest,
    ];
  }
}

function unescape(string) {
  return string
    .split("\\\\")
    .map((substr) => substr.split("\\").join(""))
    .join("\\");
}

export function parseRichBetweenDelimiters(
  markdown,
  startDelimiter,
  processContent,
  endRegex
) {
  if (!markdown.startsWith(startDelimiter)) {
    return [null, markdown];
  }

  const withoutStart = markdown.slice(startDelimiter.length);
  const [content, restIncludingEnd] = parseParagraphContentUntil(
    withoutStart,
    endRegex
  );

  if (content !== null) {
    const endMatch = restIncludingEnd.match(endRegex)[0];
    const rest = restIncludingEnd.slice(endMatch.length);
    const processedContent = processContent(content);
    if (processedContent !== null) {
      return [processedContent, rest];
    }
  }

  return [null, markdown];
}

export function parseBetweenDelimiters(
  markdown,
  startDelimiter,
  parseContent,
  endDelimiter
) {
  if (!markdown.startsWith(startDelimiter)) {
    return [null, markdown];
  }

  const withoutStart = markdown.slice(startDelimiter.length);
  const endDollarPos = markdown
    .slice(startDelimiter.length)
    .indexOf(endDelimiter);
  if (endDollarPos === -1) {
    return [null, markdown];
  }

  const rest = withoutStart.slice(endDollarPos + endDelimiter.length);
  const parsedContent = parseContent(withoutStart.slice(0, endDollarPos));
  if (parsedContent !== null) {
    return [parsedContent, rest];
  } else {
    return [null, markdown];
  }
}

export function parseLeadingKatexBlockFormula(markdown) {
  return parseBetweenDelimiters(
    markdown,
    "$$",
    (content) => {
      return content.length > 0 ? { type: "katex-block", tex: content } : null;
    },
    "$$"
  );
}

export function parseLeadingKatexInlineFormula(markdown) {
  return parseBetweenDelimiters(
    markdown,
    "$",
    (content) => {
      return content.length > 0 ? { type: "katex-inline", tex: content } : null;
    },
    "$"
  );
}

export function parseLeadingItalicText(markdown) {
  return parseRichBetweenDelimiters(
    markdown,
    "*",
    (content) => {
      return content.length > 0 ? { type: "italic", content } : null;
    },
    /\*/
  );
}

export function parseLeadingBoldText(markdown) {
  return parseRichBetweenDelimiters(
    markdown,
    "__",
    (content) => {
      return content.length > 0 ? { type: "bold", content } : null;
    },
    /__/
  );
}
