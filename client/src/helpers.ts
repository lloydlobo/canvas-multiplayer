import * as filter from "leo-profanity";

// var Filter = require("bad-words"),
//   filter = new Filter(); // console.log(filter.clean("Don't be an ash0le")); //Don't be an ******

const PROFANE_LIST = filter.list();
const PILE_OF_POO = "\u{1F4A9}"; // Emoji.

function applyWordRegex(word: string): RegExp {
  return new RegExp(word, "gi");
}

export function cleanUpProfanity(
  input: string,
  replaceKey = PILE_OF_POO,
  limiter = 2
): string {
  if (limiter <= 0 || limiter === null) {
    limiter = 2;
  }
  if (
    replaceKey === "" ||
    replaceKey === " " ||
    replaceKey === undefined ||
    replaceKey === null
  ) {
    replaceKey = PILE_OF_POO;
  }

  for (const word of PROFANE_LIST) {
    if (input.toLowerCase().includes(word)) {
      const replaceValue =
        input.substring(0, limiter) + replaceKey.repeat(word.length - limiter);

      input = input.replace(applyWordRegex(word), replaceValue);
      break;
    }
  }

  return input;
}

function isLetter(str: string): boolean {
  return str.length === 1 && str.match(/[a-z]/i) !== null;
}
