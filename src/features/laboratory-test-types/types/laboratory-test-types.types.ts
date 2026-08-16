export interface TestTypeResponse {
  id: number
  name: string
  description: string | null
  createdDate: string
}

export interface CreateTestTypePayload {
  name: string
  description: string
}
