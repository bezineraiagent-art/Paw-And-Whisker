export type PetSpecies = "puppy" | "dog" | "cat" | "other";
export type PetForm = { name: string; species: PetSpecies; age: string; weight: string; breed: string; allergies: string; conditions: string };

export const PET_KEY = "pw-free-pet";
export const petLimits = { name: 60, age: 40, weight: 40, breed: 100, allergies: 300, conditions: 300 } as const;
export const emptyPet: PetForm = { name: "", species: "puppy", age: "", weight: "", breed: "", allergies: "", conditions: "" };
const species: PetSpecies[] = ["puppy", "dog", "cat", "other"];
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Accepts the current shape and the older {petName, species, age} shape. */
export function normalizePet(raw: unknown): PetForm | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = clip(r.name ?? r.petName, petLimits.name);
  if (!name) return null;
  return {
    name,
    species: species.includes(r.species as PetSpecies) ? (r.species as PetSpecies) : "puppy",
    age: clip(r.age, petLimits.age), weight: clip(r.weight, petLimits.weight), breed: clip(r.breed, petLimits.breed),
    allergies: clip(r.allergies, petLimits.allergies), conditions: clip(r.conditions, petLimits.conditions),
  };
}

export function loadPet(): PetForm | null {
  try {
    const pet = normalizePet(JSON.parse(localStorage.getItem(PET_KEY) ?? "null"));
    if (pet) localStorage.setItem(PET_KEY, JSON.stringify(pet)); // migrate old shape in place
    return pet;
  } catch { return null; }
}
export function storePet(pet: PetForm) { localStorage.setItem(PET_KEY, JSON.stringify(pet)); }
export function removePet() { try { localStorage.removeItem(PET_KEY); } catch { /* storage unavailable */ } }

/** Payload for the API: required fields always present, optional breed omitted when blank. */
export function petPayload(p: PetForm) {
  return { name: p.name, species: p.species, age: p.age, weight: p.weight, allergies: p.allergies, conditions: p.conditions, ...(p.breed ? { breed: p.breed } : {}) };
}
export const speciesLabel: Record<PetSpecies, string> = { puppy: "Puppy", dog: "Dog", cat: "Cat", other: "Other pet" };
