export interface LaboratoryTestFileResponse {
  id: number
  originalFileName: string
  contentType: string
  sizeBytes: number
  eTag: string
  uploadedBy: { id: number; employeeCode: string; name: string }
  laboratoryTest: { id: number; date: string }
  createdDate: string
}
