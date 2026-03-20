/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountRatio = 1 - discount / 100;
    return sale_price * quantity * discountRatio;
  }
  
  /**
   * Функция для расчета бонусов
   * @param index порядковый номер в отсортированном массиве
   * @param total общее число продавцов
   * @param seller карточка продавца
   * @returns {number}
   */
  function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (!index) {
      return profit * 0.15;
    } else if (index === 1 || index === 2) {
      return profit * 0.1;
    } else if (index === total - 1) {
      return 0;
    } else {
      // Для всех остальных
      return profit * 0.05;
    }
  }
  
  /**
   * Функция для анализа данных продаж
   * @param data
   * @param options
   * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
   */
  function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (
      !data ||
      !Array.isArray(data.customers) ||
      !Array.isArray(data.products) ||
      !Array.isArray(data.sellers) ||
      !data.customers.length ||
      !data.products.length ||
      !data.sellers.length
    ) {
      throw new Error("Некорректные входные данные");
    }
  
    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
  
    if (
      typeof calculateRevenue !== "function" ||
      typeof calculateBonus !== "function"
    ) {
      throw new Error("Некорректные входные опции");
    }
  
    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map((seller) => ({
      seller,
    }));
    const productStats = data.products.map((product) => ({
      product,
    }));
  
    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
      sellerStats.map((item) => [item.seller.id, item.seller]),
    );
    const productIndex = Object.fromEntries(
      productStats.map((item) => [item.product.sku, item.product]),
    );
  
    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
      // Чек
      const seller = sellerIndex[record.seller_id]; // Продавец
      seller.name = seller.name ?? `${seller.first_name} ${seller.last_name}`;
      seller.sales_count = (seller.sales_count ?? 0) + 1; // Накопленное количество продаж
      seller.revenue = (seller.revenue ?? 0) + record.total_amount; // Накопленная выручка
      seller.profit = seller.profit ?? 0;
      seller.products_sold = seller.products_sold ?? {};
  
      // Расчёт прибыли для каждого товара
      record.items.forEach((item) => {
        const product = productIndex[item.sku]; // Товар
        const cost = product.purchase_price * item.quantity; // Себестоимость
        const revenue = calculateRevenue(item, product); // Выручка
        const profit = revenue - cost; // Прибыль
        seller.profit = seller.profit + profit; // Накопленная прибыль
  
        //Количество проданных товаров
        seller.products_sold[item.sku] =
          (seller.products_sold[item.sku] ?? 0) + item.quantity;
      });
    });
  
    sellerStats.sort((a, b) => b.seller.profit - a.seller.profit); // Сортировка продавцов по прибыли
  
    // Назначение премий на основе ранжирования
    sellerStats.forEach((item, index) => {
      item.seller.bonus = calculateBonus(index, 5, item.seller); // Считаем бонус
      item.seller.top_products = Object.entries(item.seller.products_sold).map(
        (product) => {
          return { sku: product[0], quantity: product[1] };
        },
      ); // Формируем топ-10 товаров
      item.seller.top_products.sort((a, b) => b.quantity - a.quantity);
      item.seller.top_products = item.seller.top_products.slice(0, 10);
    });
  
    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(function (item) {
      const { seller } = item;
      return {
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
      };
    });
  }
  