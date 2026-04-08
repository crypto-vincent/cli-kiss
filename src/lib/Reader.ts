import { suggestTextPushMessage } from "./Suggest";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 */
export type ReaderOptionLongSpec = {
  key: string;
  nextGuard: ReaderOptionNextGuard;
};

/**
 */
export type ReaderOptionShortSpec = {
  key: string;
  restGuard: ReaderOptionRestGuard;
  nextGuard: ReaderOptionNextGuard;
};

/**
 */
export type ReaderOptionRestGuard = (rest: string) => boolean;

/**
 */
export type ReaderOptionNextGuard = (
  value: ReaderOptionValue,
  next: string | undefined,
) => boolean;

/**
 */
export type ReaderOptionResult = {
  identifier: string;
  values: ReadonlyArray<ReaderOptionValue>;
};

/**
 */
export type ReaderOptionValue = {
  inlined: string | null;
  separated: ReadonlyArray<string>;
};

/**
 */
export type ReaderOptionGetter = () => ReaderOptionResult;

/**
 * Option registration/query interface. Subset of {@link ReaderArgs}.
 */
export type ReaderOptions = {
  registerOptionLong(longSpec: ReaderOptionLongSpec): ReaderOptionGetter;
  registerOptionShort(shortSpec: ReaderOptionShortSpec): ReaderOptionGetter;
};

/**
 * Positional consumption interface. Subset of {@link ReaderArgs}.
 */
export type ReaderPositionals = {
  /**
   * Returns the next positional token, parsing intervening options as side-effects.
   *
   * @returns The next positional, or `undefined` when exhausted.
   * @throws on an unrecognised option.
   */
  consumePositional(): string | undefined;
};

/**
 * Core argument parser: converts raw CLI tokens into named options and positionals.
 * Options must be registered before {@link ReaderArgs.consumePositional} is called.
 *
 * Supported syntax: `--name`, `--name value`, `--name=value`,
 * `-n`, `-n value`, `-nvalue`, `-abc` (stacked), `--` (end-of-options).
 *
 * Created internally by {@link runAndExit}; exposed for advanced / custom runners.
 */
export class ReaderArgs {
  #tokens: ReadonlyArray<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;
  #optionLongContextByIdentifier: Map<string, Context<ReaderOptionLongSpec>>;
  #optionShortContextByIdentifier: Map<string, Context<ReaderOptionShortSpec>>;

  /**
   * @param tokens - Raw CLI tokens (e.g. `process.argv.slice(2)`).
   */
  constructor(tokens: ReadonlyArray<string>) {
    this.#tokens = tokens;
    this.#parsedIndex = 0;
    this.#parsedDouble = false;
    this.#optionLongContextByIdentifier = new Map();
    this.#optionShortContextByIdentifier = new Map();
  }

  /**
   */
  registerOptionLong(longSpec: ReaderOptionLongSpec): ReaderOptionGetter {
    const identifier = `--${longSpec.key}`;
    if (!isValidOptionKey(longSpec.key)) {
      throw new Error(`Option identifier is invalid: ${identifier}.`);
    }
    if (this.#optionLongContextByIdentifier.has(identifier)) {
      throw new Error(`Option already registered: ${identifier}.`);
    }
    const values = new Array<ReaderOptionValue>();
    this.#optionLongContextByIdentifier.set(identifier, {
      identifier,
      spec: longSpec,
      values,
    });
    return () => ({ identifier, values });
  }

  /**
   */
  registerOptionShort(shortSpec: ReaderOptionShortSpec): ReaderOptionGetter {
    const identifier = `-${shortSpec.key}`;
    if (!isValidOptionKey(shortSpec.key)) {
      throw new Error(`Option identifier is invalid: ${identifier}.`);
    }
    if (this.#optionShortContextByIdentifier.has(identifier)) {
      throw new Error(`Option already registered: ${identifier}.`);
    }
    for (let i = 0; i < identifier.length; i++) {
      const slicedIdentifier = identifier.slice(0, 1 + i);
      if (this.#optionShortContextByIdentifier.has(slicedIdentifier)) {
        throw new Error(
          `Option ${identifier} overlap with shorter option: ${slicedIdentifier}.`,
        );
      }
    }
    for (const otherIdentifier of this.#optionShortContextByIdentifier.keys()) {
      if (otherIdentifier.startsWith(identifier)) {
        throw new Error(
          `Option ${identifier} overlap with longer option: ${otherIdentifier}.`,
        );
      }
    }
    const values = new Array<ReaderOptionValue>();
    this.#optionShortContextByIdentifier.set(identifier, {
      identifier,
      spec: shortSpec,
      values,
    });
    return () => ({ identifier, values });
  }

  /**
   * Returns the next positional token; parses intervening options as a side-effect.
   * All tokens after `--` are treated as positionals.
   *
   * @returns The next positional, or `undefined` when exhausted.
   * @throws on an unrecognised option.
   */
  consumePositional(): string | undefined {
    while (true) {
      const token = this.#consumeToken();
      if (token === undefined) {
        return undefined;
      }
      if (!this.#tryConsumeAsOption(token)) {
        return token;
      }
    }
  }

  #consumeToken(): string | undefined {
    const token = this.#tokens[this.#parsedIndex];
    if (token === undefined) {
      return undefined;
    }
    this.#parsedIndex++;
    if (!this.#parsedDouble) {
      if (token === "--") {
        this.#parsedDouble = true;
        return this.#consumeToken();
      }
    }
    return token;
  }

  #tryConsumeAsOption(token: string): boolean {
    if (this.#parsedDouble) {
      return false;
    }
    if (token.startsWith("--")) {
      const valueIndexStart = token.indexOf("=");
      if (valueIndexStart === -1) {
        this.#consumeOptionLong(token, null);
      } else {
        this.#consumeOptionLong(
          token.slice(0, valueIndexStart),
          token.slice(valueIndexStart + 1),
        );
      }
      return true;
    }
    if (token.startsWith("-")) {
      let shortIndexStart = 1;
      let shortIndexEnd = 2;
      while (shortIndexEnd <= token.length) {
        const identifier = `-${token.slice(shortIndexStart, shortIndexEnd)}`;
        const shortContext =
          this.#optionShortContextByIdentifier.get(identifier);
        if (shortContext !== undefined) {
          const tokenRest = token.slice(shortIndexEnd);
          if (this.#tryConsumeOptionShort(shortContext, tokenRest)) {
            return true;
          }
          shortIndexStart = shortIndexEnd;
        }
        shortIndexEnd++;
      }
      this.#throwUnknownOptionError(`-${token.slice(shortIndexStart)}`);
    }
    return false;
  }

  #consumeOptionLong(identifier: string, valueInlined: string | null): void {
    const longContext = this.#optionLongContextByIdentifier.get(identifier);
    if (longContext !== undefined) {
      return this.#consumeOptionValues(longContext, valueInlined);
    }
    this.#throwUnknownOptionError(identifier);
  }

  #tryConsumeOptionShort(
    shortContext: Context<ReaderOptionShortSpec>,
    tokenRest: string,
  ): boolean {
    if (tokenRest.startsWith("=")) {
      this.#consumeOptionValues(shortContext, tokenRest.slice(1));
      return true;
    }
    if (tokenRest.length === 0) {
      this.#consumeOptionValues(shortContext, null);
      return true;
    }
    if (shortContext.spec.restGuard(tokenRest)) {
      this.#consumeOptionValues(shortContext, tokenRest);
      return true;
    }
    this.#consumeOptionValues(shortContext, null);
    return false;
  }

  #consumeOptionValues(
    context: Context<{ nextGuard: ReaderOptionNextGuard }>,
    valueInlined: string | null,
  ) {
    const value = { inlined: valueInlined, separated: new Array<string>() };
    const { identifier, values, spec } = context;
    values.push(value);
    while (true) {
      const nextToken = this.#tokens[this.#parsedIndex];
      if (!spec.nextGuard(value, nextToken)) {
        return;
      }
      const token = this.#consumeToken();
      if (this.#parsedDouble) {
        throw new TypoError(
          new TypoText(
            new TypoString(identifier, typoStyleConstants),
            new TypoString(`: Requires a value but got: `),
            new TypoString(`"--"`, typoStyleQuote),
            new TypoString(`.`),
          ),
        );
      }
      // TODO - should we allow consuming the EOF token ?
      if (token === undefined) {
        throw new TypoError(
          new TypoText(
            new TypoString(identifier, typoStyleConstants),
            new TypoString(`: Requires a value, but got end of input.`), // TODO - hint at option value syntax ?
          ),
        );
      }
      // TODO - is that weird, could a valid value start with dash ?
      if (token.startsWith("-")) {
        throw new TypoError(
          new TypoText(
            new TypoString(identifier, typoStyleConstants),
            new TypoString(`: Requires a value, but got: `),
            new TypoString(`"${token}"`, typoStyleQuote),
            new TypoString(`.`),
          ),
        );
      }
      value.separated.push(token);
    }
  }

  #throwUnknownOptionError(inputIdentifier: string): never {
    const candidatesIdentifiers = [];
    for (const identifier of this.#optionLongContextByIdentifier.keys()) {
      candidatesIdentifiers.push(identifier);
    }
    for (const identifier of this.#optionShortContextByIdentifier.keys()) {
      candidatesIdentifiers.push(identifier);
    }
    const errorText = new TypoText();
    errorText.push(new TypoString(`Unknown option: `));
    errorText.push(new TypoString(`"${inputIdentifier}"`, typoStyleQuote));
    if (candidatesIdentifiers.length === 0) {
      errorText.push(new TypoString(`, no options are registered.`));
    } else {
      errorText.push(new TypoString(`.`));
      suggestTextPushMessage(
        errorText,
        inputIdentifier,
        candidatesIdentifiers.map((candidateIdentifier) => ({
          reference: candidateIdentifier,
          hint: new TypoString(candidateIdentifier, typoStyleConstants),
        })),
      );
    }
    throw new TypoError(errorText);
  }
}

function isValidOptionKey(name: string): boolean {
  return name.length > 0 && !name.includes("=") && !name.includes("\0");
}

type Context<Spec> = {
  identifier: string;
  spec: Spec;
  values: Array<ReaderOptionValue>;
};
