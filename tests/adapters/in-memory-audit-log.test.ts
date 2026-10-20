// Tests de l'adaptateur simulé du contrat P10 AuditLog : journal en mémoire (US-02b, critère 5).
// Identifiants stables L1 à L8 (contrat commun, voir audit-log-contract.ts), cités par les preuves
// par mutation.
import { InMemoryAuditLog } from "../../src/adapters/audit/in-memory-audit-log.js";
import { describeAuditLogContract } from "./audit-log-contract.js";

describeAuditLogContract("journal en mémoire", () => new InMemoryAuditLog());
