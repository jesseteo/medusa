import { createCustomersWorkflow } from "@medusajs/core-flows"

import {
  AdditionalData,
  AdminCustomer,
  PaginatedResponse,
} from "@medusajs/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "../../../types/routing"
import { refetchCustomer } from "./helpers"
import { AdminCreateCustomerType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<PaginatedResponse<{ customers: AdminCustomer }>>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "customers",
    variables: {
      filters: req.filterableFields,
      ...req.remoteQueryConfig.pagination,
    },
    fields: req.remoteQueryConfig.fields,
  })

  const { rows: customers, metadata } = await remoteQuery(query)

  res.json({
    customers,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateCustomerType & AdditionalData>,
  res: MedusaResponse<{ customer: AdminCustomer }>
) => {
  const { additional_data, ...rest } = req.validatedBody
  const createCustomers = createCustomersWorkflow(req.scope)

  const customersData = [
    {
      ...rest,
      created_by: req.auth_context.actor_id,
    },
  ]

  const { result } = await createCustomers.run({
    input: { customersData, additional_data },
  })

  const customer = await refetchCustomer(
    result[0].id,
    req.scope,
    req.remoteQueryConfig.fields
  )

  res.status(200).json({ customer })
}
