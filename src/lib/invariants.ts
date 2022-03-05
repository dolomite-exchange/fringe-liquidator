import { BigNumber } from '@dolomite-exchange/dolomite-margin';

export function checkDuration(key: string, minValue: number, isMillis: boolean = true) {
  if (Number.isNaN(Number(process.env[key])) || Number(process.env[key]) < minValue) {
    throw new Error(`${key} is invalid. Must be >= ${minValue} ${isMillis ? 'milliseconds' : 'seconds'}`);
  }
}

export function checkEthereumAddress(key: string) {
  if (!process.env[key] || !process.env[key]?.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error(`${key} is not provided or invalid`);
  }
}

export function checkPrivateKey(key: string) {
  if (!process.env[key] || !process.env[key]!.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error(`${key} is not provided or invalid`);
  }
}

export function checkBooleanValue(key: string) {
  if (process.env[key] !== 'true' && process.env[key] !== 'false') {
    throw new Error(`${key} is not provided or does not equal "true" or "false"`);
  }
}

export function checkPreferences(key: string) {
  if (!process.env[key]) {
    throw new Error(`${key} is not provided`);
  }
  const preferences = process.env[key]!.split(',');
  if (preferences.length === 0) {
    throw new Error(`${key} length is 0`);
  }
  preferences.forEach((preference, i) => {
    if (new BigNumber(preference.trim()).isNaN()) {
      throw new Error(`${key} at index=${i} is invalid`);
    }
  });
}

export function checkBigNumber(key: string) {
  if (!process.env[key] || new BigNumber(process.env[key]!).isNaN()) {
    throw new Error(`${key} is not provided or invalid`);
  }
}

export function checkJsNumber(key: string) {
  if (!process.env[key] || Number.isNaN(Number(process.env[key]))) {
    throw new Error(`${key} is not provided or invalid`);
  }
}

export function checkExists(key: string) {
  if (!process.env[key]) {
    throw new Error(`${key} is not provided`);
  }
}

export function checkConditionally(conditionKey: string, checker: () => void) {
  if (process.env[conditionKey] === 'true') {
    checker();
  }
}

export function checkUnconditionally(conditionKey: string, checker: () => void) {
  if (process.env[conditionKey] === 'false') {
    checker();
  }
}
