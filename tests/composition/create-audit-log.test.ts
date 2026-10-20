// Tests de la racine de composition, P10 AuditLog (US-02b, critère 7) : choix du journal d'audit
// selon la configuration, sans valeur par défaut. Miroir des cas A1 à A10 de createAuthProvider.
// Identifiants stables AL1 à AL9, cités par les preuves par mutation. Les messages d'erreur
// attendus sont écrits en dur.
import { describe, expect, it } from "vitest";
import { InMemoryAuditLog } from "../../src/adapters/audit/in-memory-audit-log.js";
import { type AppEnvironment, createAuditLog } from "../../src/composition/index.js";

const MISSING_MESSAGE = "Configuration incomplète : adapterAuditLog est obligatoire (valeur acceptée : « in-memory »).";

const REFUSED_MESSAGE =
  "Configuration refusée : l'adaptateur de journal d'audit « in-memory » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).";

describe("createAuditLog", () => {
  it("AL1 : adapterAuditLog « in-memory » : journal en mémoire", () => {
    expect(createAuditLog({ environment: "development", adapterAuditLog: "in-memory" })).toBeInstanceOf(
      InMemoryAuditLog,
    );
  });

  it("AL2 : adapterAuditLog absent : erreur, aucun journal par défaut", () => {
    expect(() => createAuditLog({ environment: "development" })).toThrow(new Error(MISSING_MESSAGE));
  });

  it("AL3 : adapterAuditLog undefined : même erreur", () => {
    expect(() => createAuditLog({ environment: "development", adapterAuditLog: undefined })).toThrow(
      new Error(MISSING_MESSAGE),
    );
  });

  it.each([
    ["« mock »", "mock", "Valeur inconnue pour adapterAuditLog : « mock » (valeur acceptée : « in-memory »)."],
    ["chaîne vide", "", "Valeur inconnue pour adapterAuditLog : «  » (valeur acceptée : « in-memory »)."],
    [
      "« In-Memory » (casse différente)",
      "In-Memory",
      "Valeur inconnue pour adapterAuditLog : « In-Memory » (valeur acceptée : « in-memory »).",
    ],
    ["« real »", "real", "Valeur inconnue pour adapterAuditLog : « real » (valeur acceptée : « in-memory »)."],
  ])("AL4 : refuse la valeur inconnue %s, sans repli silencieux", (_label, adapterAuditLog, message) => {
    expect(() => createAuditLog({ environment: "development", adapterAuditLog })).toThrow(new Error(message));
  });

  it("AL5 : environnement « production » et adapterAuditLog « in-memory » : erreur, composant simulé refusé", () => {
    expect(() => createAuditLog({ environment: "production", adapterAuditLog: "in-memory" })).toThrow(
      new Error(REFUSED_MESSAGE),
    );
  });

  it.each([
    ["chaîne vide", ""],
    ["« prod » (abréviation)", "prod"],
    ["« Production » (casse différente)", "Production"],
    ["« Development » (casse différente)", "Development"],
    ["undefined", undefined],
    ["null", null],
  ])("AL6 : environnement incorrect %s et adapterAuditLog « in-memory » : même erreur", (_label, environment) => {
    expect(() =>
      createAuditLog({ environment: environment as unknown as AppEnvironment, adapterAuditLog: "in-memory" }),
    ).toThrow(new Error(REFUSED_MESSAGE));
  });

  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
  ] as const)("AL7 : environnement %s et adapterAuditLog « in-memory » : journal en mémoire", (_label, environment) => {
    expect(createAuditLog({ environment, adapterAuditLog: "in-memory" })).toBeInstanceOf(InMemoryAuditLog);
  });

  it("AL8 : environnement « production » et adapterAuditLog absent : erreur de valeur absente, contrôlée en premier", () => {
    expect(() => createAuditLog({ environment: "production" })).toThrow(new Error(MISSING_MESSAGE));
  });

  it("AL9 : environnement « production » et adapterAuditLog « real » : erreur de valeur inconnue", () => {
    expect(() => createAuditLog({ environment: "production", adapterAuditLog: "real" })).toThrow(
      new Error("Valeur inconnue pour adapterAuditLog : « real » (valeur acceptée : « in-memory »)."),
    );
  });
});
