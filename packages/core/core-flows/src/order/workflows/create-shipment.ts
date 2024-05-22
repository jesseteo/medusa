import { FulfillmentDTO, OrderDTO, OrderWorkflow } from "@medusajs/types"
import {
  MedusaError,
  Modules,
  OrderStatus,
  arrayDifference,
} from "@medusajs/utils"
import {
  WorkflowData,
  createStep,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import { useRemoteQueryStep } from "../../common"
import { createShipmentWorkflow } from "../../fulfillment"
import { registerOrderShipmentStep } from "../steps"

function throwIfOrderIsCancelled({ order }: { order: OrderDTO }) {
  if (order.status === OrderStatus.CANCELED) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Order with id ${order.id} has been cancelled.`
    )
  }
}

function throwIfItemsDoesNotExistsInOrder({
  order,
  inputItems,
}: {
  order: Pick<OrderDTO, "id" | "items">
  inputItems: OrderWorkflow.CreateOrderShipmentWorkflowInput["items"]
}) {
  const orderItemIds = order.items?.map((i) => i.id) ?? []
  const inputItemIds = inputItems.map((i) => i.id)
  const diff = arrayDifference(inputItemIds, orderItemIds)

  if (diff.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Items with ids ${diff.join(", ")} does not exist in order with id ${
        order.id
      }.`
    )
  }
}

const validateOrder = createStep(
  "validate-order",
  ({
    order,
    input,
  }: {
    order: OrderDTO
    input: OrderWorkflow.CreateOrderShipmentWorkflowInput
  }) => {
    const inputItems = input.items

    throwIfOrderIsCancelled({ order })
    throwIfItemsDoesNotExistsInOrder({ order, inputItems })

    const order_ = order as OrderDTO & { fulfillments: FulfillmentDTO[] }
    const fulfillment = order_.fulfillments.find(
      (f) => f.id === input.fulfillment_id
    )
    if (!fulfillment) {
      throw new Error(
        `Fulfillment with id ${input.fulfillment_id} not found in the order`
      )
    }
  }
)

function prepareRegisterShipmentData({
  order,
  input,
}: {
  order: OrderDTO
  input: OrderWorkflow.CreateOrderShipmentWorkflowInput
}) {
  const fulfillId = input.fulfillment_id
  const order_ = order as OrderDTO & { fulfillments: FulfillmentDTO[] }
  const fulfillment = order_.fulfillments.find((f) => f.id === fulfillId)!

  return {
    order_id: order.id,
    reference: Modules.FULFILLMENT,
    reference_id: fulfillment.id,
    created_by: input.created_by,
    items: order.items!.map((i) => {
      return {
        id: i.id,
        quantity: i.quantity,
      }
    }),
  }
}

export const createOrderShipmentWorkflowId = "create-order-shipment"
export const createOrderShipmentWorkflow = createWorkflow(
  createOrderShipmentWorkflowId,
  (
    input: WorkflowData<OrderWorkflow.CreateOrderShipmentWorkflowInput>
  ): WorkflowData<void> => {
    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: [
        "id",
        "status",
        "region_id",
        "currency_code",
        "items.*",
        "fulfillments.*",
      ],
      variables: { id: input.order_id },
      list: false,
      throw_if_key_not_found: true,
    })

    validateOrder({ order, input })

    const fulfillmentData = transform({ input }, ({ input }) => {
      return {
        id: input.fulfillment_id,
        labels: input.labels,
      }
    })

    createShipmentWorkflow.runAsStep({
      input: fulfillmentData,
    })

    const shipmentData = transform(
      { order, input },
      prepareRegisterShipmentData
    )

    registerOrderShipmentStep(shipmentData)
  }
)
