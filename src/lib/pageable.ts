export default class Pageable {

  public static async getPageableValues<T>(
    getterFn: (pageIndex: number) => Promise<T[]>,
  ): Promise<T[]> {
    let results: T[] = []
    let queryResults: T[] = []
    let pageIndex: number = 0;
    do {
      queryResults = await getterFn(pageIndex)
      if (queryResults.length === 0) {
        break;
      }
      pageIndex += 1;

      results = results.concat(queryResults);
    } while (queryResults.length !== 0);

    return results
  }

}
