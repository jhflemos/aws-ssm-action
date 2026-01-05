import { ParameterStringFilter } from '@aws-sdk/client-ssm'

export type GetParametersByPathInput = {
  Path: string
  WithDecryption: boolean
  Recursive: boolean
  ParameterFilters?: ParameterStringFilter[]
}

export type SimpleParameter = {
  Name: string
  Value: string
}
