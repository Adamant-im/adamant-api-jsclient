import BigNumber from "bignumber.js";
import { MessageType, MessageTypes, SAT } from "./constants";

export const getRandomIntInclusive = (minimum: number, maximum: number) => {
  const min = Math.ceil(minimum);
  const max = Math.floor(maximum);

  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const isNumeric = (str: any): str is string =>
  typeof str === "string" && !isNaN(parseFloat(str));

export const parseJsonSafe = (json: string) => {
  try {
    const result = JSON.parse(json);

    return {
      result,
      success: true,
    };
  } catch (error) {
    return {
      error,
      success: false,
    };
  }
};

export const isPassPhrase = (passphrase: any): passphrase is string =>
  typeof passphrase === "string" && passphrase.length > 30;

export const isEndpoint = (endpoint: any): endpoint is string =>
  typeof endpoint === "string" && endpoint.startsWith("/");

const RE_ADM_ADDRESS = /^U([0-9]{6,})$/;

export const isAdmAddress = (address: any): address is `U${string}` =>
  typeof address === "string" && RE_ADM_ADDRESS.test(address);

const RE_HEX = /^[a-fA-F0-9]+$/;

export const isAdmPublicKey = (publicKey: any): publicKey is string =>
  typeof publicKey === "string" &&
  publicKey.length === 64 &&
  RE_HEX.test(publicKey);

const RE_ADM_VOTE_FOR_PUBLIC_KEY = /^(\+|-)[a-fA-F0-9]{64}$/;

export const isAdmVoteForPublicKey = (publicKey: any): publicKey is string =>
  typeof publicKey === "string" && RE_ADM_VOTE_FOR_PUBLIC_KEY.test(publicKey);

const RE_ADM_VOTE_FOR_ADDRESS = /^(\+|-)U([0-9]{6,})$/;

export const isAdmVoteForAddress = (address: any) =>
  typeof address === "string" && RE_ADM_VOTE_FOR_ADDRESS.test(address);

const RE_ADM_VOTE_FOR_DELEGATE_NAME = /^(\+|-)([a-z0-9!@$&_]{1,20})$/;

export const isAdmVoteForDelegateName = (delegateName: any): delegateName is string =>
  typeof delegateName === "string" &&
  RE_ADM_VOTE_FOR_DELEGATE_NAME.test(delegateName);

export const isIntegerAmount = (amount: number) => Number.isSafeInteger(amount);

export const isStringAmount = (amount: string) => isNumeric(amount);

export const isMessageType = (
  messageType: number,
): messageType is MessageTypes => [1, 2, 3].includes(messageType);

export const validateMessage = (message: string, messageType: MessageType = MessageType.Chat) => {
  if (typeof message !== "string") {
    return {
      success: false,
      error: "Message should be a string",
    };
  }

  if ([MessageType.Rich, MessageType.Signal].includes(messageType)) {
    const data = parseJsonSafe(message);

    const { success, result } = data;
    if (!success || typeof result !== "object") {
      return {
        success: false,
        error: `For rich and signal message, 'message' should be a JSON string`,
      };
    }

    const typeInLowerCase = result.type?.toLowerCase();
    if (
      typeInLowerCase?.includes("_transaction") &&
      typeInLowerCase !== result.type
    ) {
      return {
        success: false,
        error: `Value '<coin>_transaction' must be in lower case`,
      };
    }

    if (typeof result.amount !== "string" || !isStringAmount(result.amount)) {
      return {
        success: false,
        error: `Field 'amount' must be a string, representing a number`,
      };
    }
  }

  return { success: true };
};

const RE_ADM_DELEGATE_NAME = /^[a-z0-9!@$&_]{1,20}$/;

export const isDelegateName = (name: any): name is string =>
  typeof name === "string" && RE_ADM_DELEGATE_NAME.test(name);

export const admToSats = (amount: number) =>
  new BigNumber(String(amount)).multipliedBy(SAT).integerValue().toNumber();

export const badParameter = (name: string, value?: any, message?: string) => ({
  success: false,
  error: `Wrong '${name}' parameter${value ? `: ${value}` : ""}${
    message ? `. Error: ${message}` + message : ""
  }`,
});

export type AdamantApiResult<T> =
  | (Omit<T, "success"> & { success: true })
  | {
      success: false;
      errorMessage: string;
    };
