type SearchableTender = {
  title: string | null;
  entity: string | null;
  nomenclature: string | null;
  object_type: string | null;
  regions: string[] | null;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE").trim();
}

export function matchesSavedSearch(tender: SearchableTender, query: string) {
  const term = normalize(query);
  return !term || [tender.title, tender.entity, tender.nomenclature, tender.object_type, ...(tender.regions ?? [])]
    .some((value) => value != null && normalize(value).includes(term));
}