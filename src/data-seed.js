import { Map } from "immutable";

import articleShallowLIAndLinearCodes from "./article-sh-linear-independence-linear-codes.txt";

export function getSeed() {
  return {
    articles: [
      Map({
        id: "sh-linear-independence-linear-codes",
        title:
          "The connection between shallow linear independence and linear codes",
        text: articleShallowLIAndLinearCodes,
      }),
    ],

    references: [],
  };
}
