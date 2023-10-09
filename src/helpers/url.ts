import dns from "dns/promises";

const RE_HTTP_URL = /^https?:\/\/(.*)$/;
const RE_IP =
  /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}/;

export const parseUrl = async (url: string) => {
  const isHttps = url.startsWith("https");

  // base url without port
  const [baseURL] = url.replace(RE_HTTP_URL, "$1").split(":");

  const ip = RE_IP.test(baseURL) ? baseURL : await retrieveIP(baseURL);

  return {
    baseURL,
    ip,
    isHttps,
  };
};

export const retrieveIP = async (url: string) => {
  try {
    const addresses = await dns.resolve4(url);

    if (addresses) {
      const [address] = addresses;

      if (address !== "0.0.0.0") {
        return address;
      }
    }
  } catch (error) {
    return;
  }
};
