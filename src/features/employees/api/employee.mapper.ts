import type { Employee } from '@/types/domain'
import type { EmployeeResponse } from '../types/employee.types'

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return '?'
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? first
  // `charAt` devuelve string y no `string | undefined` como el indexado, así que
  // expresa sin ruido lo que ya era cierto: un fragmento filtrado nunca es vacío.
  return (first.charAt(0) + last.charAt(0)).toUpperCase()
}

export function mapEmployeeResponse(r: EmployeeResponse): Employee {
  return {
    id: r.id,
    employeeCode: r.employeeCode,
    name: r.name,
    email: r.email,
    enabled: r.enabled,
    mustChangePassword: r.mustChangePassword,
    status: r.status,
    companyId: r.company.id,
    createdDate: r.createdDate,
    roles: (r.roles ?? []).map((role) => ({
      employeeRoleId: role.employeeRoleId,
      id: role.id,
      name: role.name,
      code: role.code,
    })),
    branches: (r.branches ?? []).map((b) => ({ id: b.id, name: b.name })),
    initials: deriveInitials(r.name),
  }
}
