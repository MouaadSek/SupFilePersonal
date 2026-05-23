/**
 * Point d’extension API : en production, appelez votre backend qui génère une archive ZIP
 * (ex. `GET /v1/folders/:id/archive` → URL signée temporaire).
 * Tant que cette fonction renvoie `null`, l’app construit le ZIP côté client (fichiers accessibles).
 */
export async function fetchServerFolderZipUrl(_folderId: string): Promise<string | null> {
  return null;
}
