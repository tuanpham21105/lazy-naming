public class ShoppingCart {

  public double calculateTotal(double[] prices) {
    double sum = 0;
    for (double price : prices) {
      sum += price;
    }
    return sum;
  }

  public double applyToAll(double[] prices) {
    return calculateTotal(prices);
  }
}