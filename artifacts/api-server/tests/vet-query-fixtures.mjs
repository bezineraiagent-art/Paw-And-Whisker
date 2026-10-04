// Synthetic, explicit provider fixtures: not evidence of live provider accuracy.
export const queries = [
  ["75201", "Dallas", "Texas", "TX", "us", 32.78, -96.8],
  ["33101", "Miami", "Florida", "FL", "us", 25.78, -80.2],
  ["90210", "Beverly Hills", "California", "CA", "us", 34.09, -118.41],
  ["10001", "New York", "New York", "NY", "us", 40.75, -73.99],
  ["02134", "Boston", "Massachusetts", "MA", "us", 42.35, -71.13],
  ["60601", "Chicago", "Illinois", "IL", "us", 41.89, -87.62],
  ["98101", "Seattle", "Washington", "WA", "us", 47.61, -122.33],
  ["94103", "San Francisco", "California", "CA", "us", 37.77, -122.41],
  ["30301", "Atlanta", "Georgia", "GA", "us", 33.84, -84.47],
  ["75201-1234", "Dallas", "Texas", "TX", "us", 32.78, -96.8],
  ["M5V 3L9", "Toronto", "Ontario", "ON", "ca", 43.64, -79.39],
  ["SW1A 1AA", "London", "England", "ENG", "gb", 51.5, -0.14],
  ["Austin, TX", "Austin", "Texas", "TX", "us", 30.27, -97.74],
];
export function responseFor(row) {
  const [query, city, state, stateCode, country, lat, lon] = row;
  const postalcode = query === "Austin, TX" ? undefined : country === "us" ? query.slice(0, 5) : query;
  const countryName = { us: "United States", ca: "Canada", gb: "United Kingdom" }[country];
  return {
    nominatim: [{ lat: String(lat), lon: String(lon), address: { city, state, country: countryName, country_code: country, postcode: postalcode, "ISO3166-2-lvl4": `${country.toUpperCase()}-${stateCode}` } }],
    postal: { "post code": postalcode, "country abbreviation": "US", places: [{ "place name": city, state, "state abbreviation": stateCode, latitude: String(lat), longitude: String(lon) }] },
  };
}