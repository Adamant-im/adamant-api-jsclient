import { EPOCH_TIME } from "./constants";

export const getEpochTime = (timestamp?: number) => {
  const startTimestamp = timestamp ?? Date.now();
  const epochTimestamp = EPOCH_TIME.getTime();

  return Math.floor((startTimestamp - epochTimestamp) / 1000);
};

export const unixTimestamp = () => new Date().getTime();
