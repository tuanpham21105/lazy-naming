def compute_discount(price, percent):
    """Compute the discounted price."""
    return price * (1 - percent / 100)


def compute_discount_for(prices, percent):
    return [compute_discount(p, percent) for p in prices]


def apply_discount(price, percent):
    return compute_discount(price, percent)