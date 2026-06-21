/**
 * Default `adamant-api` entry point: the full ADM SDK surface plus the bundled
 * ADM and external-coin wallet metadata. Importing this entry point does not
 * load coin-specific implementations.
 *
 * @module
 */

export * from './adm/index';
export * from './metadata/index';
