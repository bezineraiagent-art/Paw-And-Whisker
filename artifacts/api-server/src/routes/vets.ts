import { Router } from "express";
import { SearchVetsBody } from "@workspace/api-zod";
import { createVetDirectory, DirectoryError, OpenStreetMapProvider } from "../lib/vet-directory";
import { requestLimit } from "../lib/request-limits";

export function createVetsRouter(provider = new OpenStreetMapProvider() as import("../lib/vet-directory").VetDirectoryProvider) {
const router = Router();
const search = createVetDirectory(provider);
router.post("/vets/search", requestLimit(30, 60_000, "vet-search"), async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = SearchVetsBody.safeParse(req.body);
  const data = parsed.success ? parsed.data : null;
  const city = !!data?.query?.trim();
  const position = data?.latitude !== undefined && data.longitude !== undefined;
  if (!data || city === position || (city && data.query!.trim().length < 2) ||
      (city && (data.latitude !== undefined || data.longitude !== undefined))) {
    res.status(400).json({ error: "Enter a city or postcode, or share your location on request. Please use only one search method." }); return;
  }
  try {
    const result = await search(data);
    // Anonymous coarse operational counts only: never coordinates, search queries or contact details.
    req.log.info({ urgent: result.urgent, method: city ? "city-postcode" : "location", resultCount: result.clinics.length }, "Vet search completed");
    res.json(result);
  } catch (error) {
    const failure = error instanceof DirectoryError ? error : new DirectoryError("The public map service is unavailable. Please try again shortly, or call a clinic directly.");
    req.log.warn({ status: failure.status }, "Vet map service unavailable");
    res.status(failure.status).json({ error: failure.message });
  }
});
return router;
}
export default createVetsRouter();