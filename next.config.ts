import type { NextConfig } from "next";

// Configuration minimale de Next.js (US-02c).
// useTypeScriptCli : Next appelle le tsc du projet (TypeScript 7, qui n'expose plus l'API
// programmatique classique) au lieu de l'API de TypeScript, pour vérifier les types et lire la
// configuration. C'est la valeur par défaut de Next 16.4.2 ; elle est écrite ici pour que le
// choix reste visible si ce défaut change.
// agentUpgrade : désactivé. Sinon, next build et next dev interrogent le registre npm sur les
// failles connues et peuvent arrêter la commande pour pousser une mise à jour ; la veille de
// sécurité passe par npm audit (.github/workflows/audit.yml).
// agentRules : désactivé. Sinon, next dev crée et recrée AGENTS.md ; les règles des agents
// sont celles de CLAUDE.md.
const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    useTypeScriptCli: true,
    agentUpgrade: false,
  },
};

export default nextConfig;
