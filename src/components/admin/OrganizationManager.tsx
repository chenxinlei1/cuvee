"use client";

import { useState } from "react";
import type { OrganizationType, Role } from "@/lib/auth/types";
import { rolesAllowedForOrganization } from "@/lib/auth/types";

interface OrgRow {
  id: string;
  name: string;
  type: OrganizationType;
  createdAt: number;
  memberCount: number;
}

interface MemberRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  createdAt: number;
}

const TYPE_LABELS: Record<OrganizationType, string> = {
  chateau: "Château",
  negociant: "Négociant",
  distributor: "Distributor",
  buyer: "Buyer",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  disabled: "bg-surface-3 text-foreground",
};

function time(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function OrganizationManager({
  initialOrganizations,
  canCreate,
  currentUserId,
  myOrganizationId,
}: {
  initialOrganizations: OrgRow[];
  canCreate: boolean;
  currentUserId: string;
  myOrganizationId?: string;
}) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState({ name: "", type: "chateau" as OrganizationType });
  const [invites, setInvites] = useState<
    Record<string, { email: string; name: string; role: Role }>
  >({});

  async function loadMembers(orgId: string) {
    const response = await fetch(`/api/admin/organizations/${orgId}/members`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { members: MemberRow[] };
      setMembers((current) => ({
        ...current,
        [orgId]: data.members,
      }));
    }
  }

  async function toggleOrg(orgId: string) {
    if (expanded === orgId) {
      setExpanded(null);
      return;
    }
    setExpanded(orgId);
    await loadMembers(orgId);
  }

  async function createOrganization() {
    setMessage(null);
    if (newOrg.name.trim().length < 2) {
      setMessage("Organization name is required");
      return;
    }
    const response = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newOrg),
    });
    const data = (await response.json()) as { organization?: OrgRow; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Create failed");
      return;
    }
    setOrganizations((current) => [...current, data.organization!]);
    setNewOrg({ name: "", type: "chateau" });
  }

  async function invite(orgId: string) {
    setMessage(null);
    const organization = organizations.find((item) => item.id === orgId);
    if (!organization) return;
    const availableRoles = [
      ...(canCreate ? (["platformAdmin"] as Role[]) : []),
      ...rolesAllowedForOrganization(organization.type),
    ];
    const form = invites[orgId] ?? {
      email: "",
      name: "",
      role: availableRoles[0] ?? "buyerStaff",
    };
    const response = await fetch(`/api/admin/organizations/${orgId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as {
      devUrl?: string;
      error?: string;
      invited?: { email: string };
    };
    if (!response.ok) {
      setMessage(data.error ?? "Invite failed");
      return;
    }
    setInvites((current) => ({ ...current, [orgId]: { email: "", name: "", role: form.role } }));
    setMessage(
      `Invited ${data.invited?.email ?? form.email}${data.devUrl ? ` — dev link: ${data.devUrl}` : ""}`,
    );
    await loadMembers(orgId);
    setOrganizations((current) =>
      current.map((org) => (org.id === orgId ? { ...org, memberCount: org.memberCount + 1 } : org)),
    );
  }

  async function patchMember(
    orgId: string,
    memberId: string,
    patch: { role?: Role; status?: "pending" | "active" | "disabled" },
  ) {
    setMessage(null);
    const response = await fetch(`/api/admin/organizations/${orgId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }
    await loadMembers(orgId);
  }

  return (
    <section className="card-lg mt-6 overflow-hidden">
      <div className="border-line border-b px-6 py-5">
        <p className="kicker">Organizations</p>
        <h2 className="mt-1 text-lg font-semibold">{organizations.length} organization(s)</h2>
      </div>
      {message ? (
        <p className="border-line bg-surface-1 border-b px-6 py-3 text-sm">{message}</p>
      ) : null}

      {canCreate ? (
        <div className="border-line bg-surface-1/50 flex flex-wrap items-end gap-3 border-b px-6 py-4">
          <label className="text-xs">
            <span className="text-soft mb-1 block">Organization name</span>
            <input
              value={newOrg.name}
              onChange={(event) => setNewOrg({ ...newOrg, name: event.target.value })}
              placeholder="e.g. Château Margaux"
              className="admin-input w-56"
            />
          </label>
          <label className="text-xs">
            <span className="text-soft mb-1 block">Type</span>
            <select
              value={newOrg.type}
              onChange={(event) =>
                setNewOrg({ ...newOrg, type: event.target.value as OrganizationType })
              }
              className="border-line bg-surface-1 rounded-md border px-2 py-2"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => void createOrganization()} className="chip">
            Create organization
          </button>
        </div>
      ) : null}

      {organizations.length === 0 ? (
        <p className="text-soft px-6 py-12 text-center text-sm">No organizations yet.</p>
      ) : (
        <div className="divide-line divide-y">
          {organizations.map((org) => {
            const isExpanded = expanded === org.id;
            const orgMembers = members[org.id] ?? [];
            const availableRoles = [
              ...(canCreate ? (["platformAdmin"] as Role[]) : []),
              ...rolesAllowedForOrganization(org.type),
            ];
            const inviteForm = invites[org.id] ?? {
              email: "",
              name: "",
              role: availableRoles[0] ?? "buyerStaff",
            };
            const isMine = org.id === myOrganizationId;
            return (
              <div key={org.id}>
                <button
                  onClick={() => void toggleOrg(org.id)}
                  className="hover:bg-surface-1/60 flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span>
                    <strong className="block">{org.name}</strong>
                    <span className="text-soft text-xs">
                      {TYPE_LABELS[org.type]} · {org.memberCount} member(s) · since{" "}
                      {time(org.createdAt)}
                      {isMine ? " · yours" : ""}
                    </span>
                  </span>
                  <span className="text-soft text-xs">
                    {isExpanded ? "collapse −" : "manage +"}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-line border-t bg-background/50 px-6 py-5">
                    <div className="mb-4 flex flex-wrap items-end gap-3">
                      <label className="text-xs">
                        <span className="text-soft mb-1 block">Email</span>
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(event) =>
                            setInvites((current) => ({
                              ...current,
                              [org.id]: { ...inviteForm, email: event.target.value },
                            }))
                          }
                          placeholder="member@example.com"
                          className="admin-input w-56"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="text-soft mb-1 block">Name</span>
                        <input
                          value={inviteForm.name}
                          onChange={(event) =>
                            setInvites((current) => ({
                              ...current,
                              [org.id]: { ...inviteForm, name: event.target.value },
                            }))
                          }
                          placeholder="Member name"
                          className="admin-input w-44"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="text-soft mb-1 block">Role</span>
                        <select
                          value={inviteForm.role}
                          onChange={(event) =>
                            setInvites((current) => ({
                              ...current,
                              [org.id]: { ...inviteForm, role: event.target.value as Role },
                            }))
                          }
                          className="border-line bg-surface-1 rounded-md border px-2 py-2 text-xs"
                        >
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button onClick={() => void invite(org.id)} className="chip">
                        Invite
                      </button>
                    </div>

                    {orgMembers.length === 0 ? (
                      <p className="text-soft py-6 text-center text-xs">No members yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="text-soft border-line border-b text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="py-2 pr-4 font-semibold">Member</th>
                              <th className="px-4 py-2 font-semibold">Role</th>
                              <th className="px-4 py-2 font-semibold">Status</th>
                              <th className="px-4 py-2 font-semibold">Joined</th>
                              <th className="py-2 text-right font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-line divide-y">
                            {orgMembers.map((member) => (
                              <tr key={member.id}>
                                <td className="py-3 pr-4">
                                  <span className="block text-xs font-medium">{member.name}</span>
                                  <span className="text-soft text-xs">{member.email}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={member.role}
                                    disabled={member.id === currentUserId}
                                    onChange={(event) =>
                                      void patchMember(org.id, member.id, {
                                        role: event.target.value as Role,
                                      })
                                    }
                                    className="border-line bg-surface-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                                  >
                                    {availableRoles.map((role) => (
                                      <option key={role} value={role}>
                                        {role}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[member.status] ?? "bg-surface-3"}`}
                                  >
                                    {member.status}
                                  </span>
                                </td>
                                <td className="text-soft px-4 py-3 text-xs">
                                  {time(member.createdAt)}
                                </td>
                                <td className="py-3 text-right">
                                  {member.id !== currentUserId ? (
                                    <>
                                      {member.status !== "disabled" ? (
                                        <button
                                          onClick={() =>
                                            void patchMember(org.id, member.id, {
                                              status: "disabled",
                                            })
                                          }
                                          className="chip text-red-600 hover:bg-red-500/10"
                                        >
                                          Disable
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            void patchMember(org.id, member.id, {
                                              status: "active",
                                            })
                                          }
                                          className="chip"
                                        >
                                          Enable
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-soft text-xs">you</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
