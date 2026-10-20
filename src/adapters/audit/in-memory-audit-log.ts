// Adaptateur simulé du contrat P10 AuditLog : journal en mémoire, propre à chaque instance (aucun
// stockage partagé entre instances), perdu à l'arrêt du processus. En ajout seul : chaque entrée
// est copiée et gelée à l'ajout, et list renvoie une copie gelée, distincte du stockage interne,
// dans l'ordre d'insertion. L'appelant ne peut donc modifier le journal ni avant ni après coup.
import type { AuditEntry, AuditLog } from "../../domain/audit/audit-log.js";

export class InMemoryAuditLog implements AuditLog {
  private readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(Object.freeze({ ...entry }));
  }

  async list(): Promise<readonly AuditEntry[]> {
    return Object.freeze([...this.entries]);
  }
}
