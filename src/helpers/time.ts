export const EPOCH_TIME = new Date(Date.UTC(2017, 8, 2, 17, 0, 0, 0));

export const getEpochTime = (timestamp?: number) => {
  const startTimestamp = timestamp ?? Date.now();
  const epochTimestamp = EPOCH_TIME.getTime();

  return Math.floor((startTimestamp - epochTimestamp) / 1000);
};

export const unixTimestamp = () => new Date().getTime();
