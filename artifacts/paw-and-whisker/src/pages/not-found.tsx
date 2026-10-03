import { ContentDocument } from "./ContentPage";
import { notFoundPage } from "@/content/site";

export default function NotFound() {
  return <ContentDocument page={notFoundPage} />;
}
