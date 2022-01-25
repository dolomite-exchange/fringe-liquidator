import { delay } from './delay';
import { updateGasPrice } from './gas-price';
import Logger from './logger';

const UPDATE_FREQUENCY_MS = Number(process.env.GAS_PRICE_UPDATE_FREQUENCY_MS);

export default class GasPriceUpdater {
  start = () => {
    Logger.info({
      at: 'GasPriceUpdater#start',
      message: 'Starting gas price updater',
    });
    this.updateGasPrices();
  }

  updateGasPrices = async () => {
    // noinspection InfiniteLoopJS
    for (;;) {
      try {
        await updateGasPrice();
      } catch (error) {
        Logger.error({
          at: 'GasPriceUpdater#updateGasPrices',
          message: 'Failed to update gas price',
          error,
        });
      }

      await delay(UPDATE_FREQUENCY_MS);
    }
  }
}
