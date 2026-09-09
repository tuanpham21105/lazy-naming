export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

const TAX_RATE = 0.1;

export function calculateTotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 + TAX_RATE);
}

export function calculateTotalsForGroup(groups: OrderItem[][]): number[] {
  return groups.map((group) => calculateTotal(group));
}

export function formatReceipt(items: OrderItem[]): string {
  const total = calculateTotal(items);
  return `Total: ${total.toFixed(2)}`;
}

export function summarize(
  orders: OrderItem[][],
): { count: number; revenue: number } {
  let count = 0;
  let revenue = 0;
  for (const order of orders) {
    count += order.length;
    revenue += calculateTotal(order);
  }
  return { count, revenue };
}

export class Cart {
  private items: OrderItem[] = [];

  add(item: OrderItem): void {
    this.items.push(item);
  }

  get total(): number {
    return calculateTotal(this.items);
  }

  get itemCount(): number {
    return this.items.length;
  }
}