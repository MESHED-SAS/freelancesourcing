// Page de connexion (US-02c, CA6 et CA10) : un bouton par persona de démonstration, affiché par
// son libellé ; le bouton envoie la key du persona (jamais le jeton ni l’adresse : la liste
// services.demoPersonas n’en contient pas, SV6). Aucune décision ici : la connexion est décidée par
// login.ts, appliquée par actions.ts. Après un refus, un message neutre et fixe (CA10).
// getRuntimeServices appelle connection() : la page est rendue à chaque requête, jamais figée au
// build ; en production ou APP_ENV absent, l’erreur de configuration empêche tout rendu (décision 17).
// Textes en apostrophe typographique (’) : une apostrophe droite dans un texte JSX gênerait la
// lecture des tests d’architecture.

import { getRuntimeServices } from "../runtime-services.js";
import { loginAction } from "../session/actions.js";
import { isLoginFailure, LOGIN_FAILURE_MESSAGE, LOGIN_FORM_FIELD } from "../session/login.js";

// Forme des props d’une page dans Next 16.4.2 : searchParams est une promesse
// (PageProps, .next/types/routes.d.ts, l. 39, fichier généré). Écrite ici en clair, car .next/
// n’existe pas en CI quand npm test vérifie les types.
interface LoginPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const services = await getRuntimeServices();
  const failed = isLoginFailure(await searchParams);
  return (
    <main>
      <h1>Connexion</h1>
      <p>Mode démonstration : choisissez un profil fictif.</p>
      {failed ? <p role="alert">{LOGIN_FAILURE_MESSAGE}</p> : null}
      <form action={loginAction}>
        <ul>
          {services.demoPersonas.map((choice) => (
            <li key={choice.key}>
              <button type="submit" name={LOGIN_FORM_FIELD} value={choice.key}>
                {choice.label}
              </button>
            </li>
          ))}
        </ul>
      </form>
    </main>
  );
}
