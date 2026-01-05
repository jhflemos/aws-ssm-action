import { ParameterStringFilter } from '@aws-sdk/client-ssm'

export type GetParametersByPathInput = {
  Path: string
  WithDecryption: boolean
  Recursive: boolean
  ParameterFilters?: ParameterStringFilter[]
}

export interface SimpleParameter {
  Name: string
  Value: string
  Type: string
}
