/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const discountDecimal = discount / 100;
  return (sale_price * quantity) * (1 - discountDecimal);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
  if (index === total - 1) {
    return 0;
  }
  if (index === 0) {
    return 15;
  }
  if (index === 1 || index === 2) {
    return 10;
  }
  return 5;
}



/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data || typeof data !== 'object') {
    throw new Error('Некорректные входные данные');
  }
  if (!data.purchase_records || !Array.isArray(data.purchase_records)) {
    throw new Error('Поле purchase_records отсутствует или не является массивом');
  }
  if (data.purchase_records.length === 0) {
    return [];
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || typeof calculateRevenue !== 'function') {
    throw new Error('В options не передана функция calculateRevenue');
  }
  if (!calculateBonus || typeof calculateBonus !== 'function') {
    throw new Error('В options не передана функция calculateBonus');
  }

  const sellerStats = data.sellers.map(seller => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));

  const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.id, s]));
  const productIndex = data.products && Array.isArray(data.products)
    ? Object.fromEntries(data.products.map(p => [p.sku, p]))
    : {};

  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  sellerStats.forEach((seller, index) => {
    const total = sellerStats.length;
    const bonusPercent = calculateBonus(index, total, seller);
    seller.bonus = seller.profit * (bonusPercent / 100);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map(seller => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2)
  }));
} 