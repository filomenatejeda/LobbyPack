// eslint-disable-next-line node/no-deprecated-api
import {UrlWithParsedQuery, parse} from 'url'

// eslint-disable-next-line-@typesrcipt-eslint/no-extraneous-class
export class UrlLogin {
  public static parsedUrl (url: string): UrlWithParsedQuery {
    return parse(url, true)
  }
}
