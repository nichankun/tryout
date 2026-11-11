export interface AdminAuditActor {
  id: string;
  name: string;
  email: string;
}

export interface AdminAuditEvent {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function createAdminAuditEntry(actor: AdminAuditActor, event: AdminAuditEvent) {
  return {
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadata: event.metadata ?? null,
  };
}
