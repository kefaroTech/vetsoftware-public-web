import type { Employee } from '@/types/domain'
import type { EmployeeResponse } from './employee.api'

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function mapEmployeeResponse(r: EmployeeResponse): Employee {
  return {
    id: r.id,
    employeeCode: r.employeeCode,
    name: r.name,
    email: r.email,
    status: r.status,
    companyId: r.company.id,
    createdDate: r.createdDate,
    roles: (r.roles ?? []).map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
    })),
    initials: deriveInitials(r.name),
  }
}
