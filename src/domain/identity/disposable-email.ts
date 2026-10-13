// Détection des adresses email jetables (US-02, critère 4) : une adresse est jetable si son
// domaine figure dans la liste, ou en est un sous-domaine (« a.b.yopmail.com » est jetable si
// « yopmail.com » figure dans la liste). Un domaine qui se termine seulement par le même texte
// ne l'est pas (« notexemple.test » n'est pas jetable si « exemple.test » figure dans la liste). Comparaison insensible à la casse.
//
// La liste est un paramètre, fournie par l'appelant : le domaine ne contient aucune liste écrite
// en dur. Elle peut ainsi évoluer (fichier, service externe) sans modifier les règles métier, et
// les tests utilisent leur propre liste. Liste vide : aucune adresse n'est jetable.
//
// Une entrée vide ne correspond à rien : le domaine d'une EmailAddress n'est jamais vide et ne
// se termine jamais par un point (validé à sa création).
import type { EmailAddress } from "./email-address.js";

export function isDisposableEmail(email: EmailAddress, disposableDomains: readonly string[]): boolean {
  return disposableDomains.some((entry) => {
    const disposableDomain = entry.toLowerCase();
    return email.domain === disposableDomain || email.domain.endsWith(`.${disposableDomain}`);
  });
}
