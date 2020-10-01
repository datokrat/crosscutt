import { Map, List, Seq } from "immutable";

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
    parseTableAndRest(inputLines) ||
    parseListAndRest(inputLines) ||
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

function parseListAndRest(inputLines) {
  const [list, remaining] = parseList(inputLines, "*");

  return list !== null ? parseLines(remaining, List()).unshift(list) : null;
}

function parseList(lines, symbol) {
  let items = List();
  let remaining = lines;

  while (remaining.size > 0) {
    const [item, rest] = parseListItem(remaining, symbol);

    if (item !== null) {
      remaining = rest;
      items = items.push(item);
    } else {
      break;
    }
  }

  return items.size > 0
    ? [{ type: "unordered-list", items }, remaining]
    : [null, lines];
}

function parseListItem(lines, symbol) {
  if (lines.size > 0 && lines.first().startsWith(symbol)) {
    const [inlineContent, _] = parseParagraphContentUntil(
      lines.first().slice(symbol.length),
      /$/
    );

    const [sublist, rest] = parseList(lines.shift(), symbol + "*");

    if (sublist !== null) {
      return [[...inlineContent, sublist], rest];
    } else {
      return [inlineContent, lines.shift()];
    }
  } else {
    return [null, lines];
  }
}

function parseTableAndRest(inputLines) {
  if (inputLines.size === 0) {
    return null;
  }

  const first = inputLines.first();
  const remaining = inputLines.shift();

  const header = parseTableHeader(first);
  if (header === null) {
    return null;
  }

  const [rows, rest] = parseTableBodyRows(remaining);

  const table = {
    type: "table",
    head: header,
    body: rows,
  };

  return parseLines(rest, List()).unshift(table);
}

function parseTableHeader(line) {
  return parseTableBodyRow(line);
}

function parseTableBodyRows(lines) {
  let remaining = lines;
  let rows = List();

  while (remaining.size > 0) {
    const row = parseTableBodyRow(remaining.first());
    if (row !== null) {
      remaining = remaining.shift();
      rows = rows.push(row);
    } else {
      return [rows, remaining];
    }
  }

  return [rows, remaining];
}

function parseTableBodyRow(line) {
  if (!line.startsWith("|")) {
    return null;
  }

  let rest = line.slice(1);
  let cols = List();
  while (rest !== "") {
    const result = parseRichBetweenDelimiters(
      rest,
      "",
      (content) => content,
      /\||$/
    );

    if (!wasParsingSuccessful(result)) {
      return null;
    }

    if (
      parsingRest(result).length !== 0 ||
      parsingOutput(result).length !== 0
    ) {
      cols = cols.push(parsingOutput(result));
    }

    rest = parsingRest(result);
  }

  return cols;
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
  const result = parseParagraphContentUntil(markdown, /$/);
  return wasParsingSuccessful(result) ? parsingOutput(result) : null;
}

function parseParagraphContentUntil(markdown, predicateRegex) {
  const startPredicateRegex = new RegExp(
    "^(" + predicateRegex.source + ")",
    ""
  );
  let rest = markdown;
  const output = [];
  let lastItem = null;
  let i = 0;
  while (rest.search(startPredicateRegex) === -1 && i < 2000) {
    ++i;
    const nextResult = parseNext(rest, predicateRegex);

    if (!wasParsingSuccessful(nextResult)) {
      return parsingError();
    }

    const item = parsingOutput(nextResult);
    rest = parsingRest(nextResult);

    if (lastItem !== null) {
      if (lastItem.type === "text" && item.type === "text") {
        lastItem = {
          type: "text",
          value: lastItem.value + item.value,
        };
      } else {
        output.push(lastItem);
        lastItem = item;
      }
    } else {
      lastItem = item;
    }
  }

  if (rest.search(startPredicateRegex) === -1) {
    return parsingError();
  }

  if (lastItem !== null) {
    output.push(lastItem);
  }

  return parsingResult(output, rest);
}

export function parseMarkdownParagraph(markdown) {
  const content = parseMarkdownParagraphContent(markdown);

  return content !== null
    ? {
        type: "paragraph",
        content: parseMarkdownParagraphContent(markdown),
      }
    : null;
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
  const result = Seq(options)
    .map((option) => option(markdown))
    .find(wasParsingSuccessful);
  return result !== undefined ? result : parsingError();
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
    const caption = betweenBraces;
    const rest = markdown.slice(endingBracePos + 2);
    return [
      {
        type: "article-link",
        content: caption,
        path: caption,
      },
      rest,
    ];
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

export function parsingResult(output, rest) {
  return [output, rest];
}

export function parsingError() {
  return [null, null];
}

export function wasParsingSuccessful(result) {
  return result[0] !== null;
}

export function parsingOutput(result) {
  return result[0];
}

export function parsingRest(result) {
  return result[1];
}
