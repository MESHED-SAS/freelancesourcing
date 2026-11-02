"use server";

// Actions serveur de connexion et de déconnexion (US-02c, CA6 et CA7). Fichier mince, non testé
// par Vitest : les décisions viennent de login.ts (testé). Règles (CLAUDE.md §2) :
// - un fichier "use server" n'exporte que des actions : chaque export est un point d'entrée POST
//   public ; constantes et logique restent dans login.ts ;
// - aucun try/catch : redirect() lève une exception qu'un catch avalerait (contrôle AR6,
//   tests/architecture/redirect-usage.test.ts).
// Les cookies ne peuvent être écrits que dans une action serveur ou un gestionnaire de route.
// Production ou APP_ENV absent : getRuntimeServices lève l'erreur de configuration, aucune action
// n'aboutit (échec fermé, décision 17).

import { cookies } from "next/headers.js";
import { redirect } from "next/navigation.js";
import { getRuntimeServices } from "../runtime-services.js";
import {
  decideLogin,
  LOGIN_FAILURE_PATH,
  LOGIN_FORM_FIELD,
  LOGIN_PAGE_PATH,
  LOGIN_SUCCESS_PATH,
  sessionCookieDeletion,
} from "./login.js";

export async function loginAction(formData: FormData): Promise<void> {
  const services = await getRuntimeServices();
  const decision = decideLogin(services, formData.get(LOGIN_FORM_FIELD));
  if (decision.kind === "login-refused") redirect(LOGIN_FAILURE_PATH);
  const { name, value, options } = decision.cookie;
  (await cookies()).set(name, value, options);
  redirect(LOGIN_SUCCESS_PATH);
}

export async function logoutAction(): Promise<void> {
  const services = await getRuntimeServices();
  const deletion = sessionCookieDeletion(services.environment);
  (await cookies()).set(deletion.name, deletion.value, deletion.options);
  redirect(LOGIN_PAGE_PATH);
}
