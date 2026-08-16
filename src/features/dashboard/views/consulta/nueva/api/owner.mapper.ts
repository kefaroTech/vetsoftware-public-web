import type { Owner } from '@/types/domain'
import type { OwnerResponse } from '../types/owner.types'

export function mapOwnerResponse(r: OwnerResponse): Owner {
  return {
    id: String(r.id),
    name: r.name,
    document: r.document,
    phone: r.phone ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    city: r.city ? { id: String(r.city.id), name: r.city.name } : null,
    pets: [],
    createdAt: r.createdDate,
  }
}
