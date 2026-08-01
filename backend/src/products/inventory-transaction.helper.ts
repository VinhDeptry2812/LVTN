import { EntityManager } from 'typeorm';
import { InventoryTransaction } from './inventory-transaction.entity';

export interface LogTransactionParams {
  manager: EntityManager;
  variantId: number;
  changeQty: number;
  prevStock: number;
  newStock: number;
  type: string;
  note?: string;
  referenceId?: string;
  userId?: number;
}

export async function logInventoryTransaction(
  params: LogTransactionParams,
): Promise<InventoryTransaction> {
  const {
    manager,
    variantId,
    changeQty,
    prevStock,
    newStock,
    type,
    note,
    referenceId,
    userId,
  } = params;

  const transaction = manager.create(InventoryTransaction, {
    variant: { id: variantId },
    change_qty: changeQty,
    previous_stock: prevStock,
    new_stock: newStock,
    type,
    note: note || null,
    reference_id: referenceId || null,
    user: userId ? { id: userId } : null,
  } as any);

  return await manager.save(transaction);
}
