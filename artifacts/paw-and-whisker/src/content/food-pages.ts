import { foods } from "./foods";
import { buildFoodPage } from "./food-article-renderer";
import type { SitePage } from "./site";

export function foodPages(): SitePage[] {
  return foods.map(food => buildFoodPage(food, foods));
}